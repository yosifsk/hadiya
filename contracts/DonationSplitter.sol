// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DonationSplitter
/// @notice موزّع تبرّعات: كل تبرّع يُقسَّم داخل نفس المعاملة إلى
///         حصة الجهة المستفيدة وحصة المنصة (الكولكتر).
/// @dev قواعد الشفافية:
///      - الرسوم **متدرّجة** ومفروضة داخل العقد: كلما زاد مبلغ التبرّع انخفضت النسبة.
///        العتبات تُضبط لكل رمز بالوحدة الأصلية (RAW) بواسطة المالك مرة واحدة
///        (وبشكل دوري للرموز المتقلّبة مثل ETH).
///      - الحد الأقصى للرسوم ٩٪ (900 bps) والحد الأدنى ٣٪ (300 bps) — لا يمكن تجاوزهما.
///      - collector ثابت (immutable) لا يمكن تغييره بعد النشر.
///      - لا تُحفظ أي أموال داخل العقد: يُدفع المبلغان فورًا في نفس المعاملة.
///      - التبرّع الذكي (ERC20) يُقاس بالمبلغ المستلم فعليًا (balance before/after).
contract DonationSplitter {
    uint256 public constant BPS = 10000;

    /// الحد الأقصى للرسوم — يُثبَّت عند النشر (immutable) ولا يتغيّر بعده
    uint16 public immutable MAX_FEE_BPS;
    /// الحد الأدنى للرسوم — يُثبَّت عند النشر (immutable).
    /// بقيمته 0 يصبح نموذج "بلا رسوم" (٠٪) ممكنًا بلا تعديل الكود.
    uint16 public immutable MIN_FEE_BPS;

    /// نسب الشروح: حتى ٢٠٠ → ٩٪ ، فوق ٢٠٠ → ٧٪ ، فوق ٣٠٠ → ٥٪ ، فوق ٤٠٠ → ٣٪
    uint16 public constant FEE_TIER_1 = 900;
    uint16 public constant FEE_TIER_2 = 700;
    uint16 public constant FEE_TIER_3 = 500;
    uint16 public constant FEE_TIER_4 = 300;

    address public immutable collector; // محفظة المنصة (لا تتغيّر)
    address public immutable owner;

    /// عتبات الشروح بالوحدة الأصلية لكل رمز: threshold1/2/3
    struct Tiers {
        bool enabled;
        uint128 threshold1; // حتى هذا المبلغ → FEE_TIER_1
        uint128 threshold2; // حتى هذا المبلغ → FEE_TIER_2
        uint128 threshold3; // حتى هذا المبلغ → FEE_TIER_3
        uint64 updatedAt;
    }

    mapping(address => Tiers) public tiers; // address(0) = العملة الأصلية للشبكة

    struct Campaign {
        address charity; // محفظة الجهة المستفيدة
        address organizer; // منظّم الحملة — الوحيد الذي يقدر يغيّر عنوان المحفظة
        bool active;
        uint64 createdAt;
    }

    mapping(uint256 => Campaign) private _campaigns;
    uint256 public nextCampaignId = 1;

    event CampaignCreated(uint256 indexed campaignId, address indexed charity, address indexed organizer);
    event CharityUpdated(uint256 indexed campaignId, address indexed charity, address indexed organizer);
    event CampaignDeactivated(uint256 indexed campaignId);
    event TiersUpdated(address indexed token, uint128 threshold1, uint128 threshold2, uint128 threshold3, bool enabled);
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        address indexed charity,
        address token,
        uint256 gross,
        uint256 toCharity,
        uint256 fee,
        uint16 feeBps
    );
    event StrayTokensSwept(address indexed token, address to, uint256 amount);

    error NotOwner();
    error NotOrganizer();
    error BadAddress();
    error UnknownCampaign();
    error InactiveCampaign();
    error ZeroAmount();
    error TransferFailed();
    error Reentrancy();
    error BadTiers();
    error BadFeeBounds();
    error FeeTooHigh();

    constructor(address collector_, uint16 minFeeBps, uint16 maxFeeBps) {
        if (collector_ == address(0)) revert BadAddress();
        if (maxFeeBps > 1500) revert FeeTooHigh(); // سقف أمان ١٥٪
        if (minFeeBps > maxFeeBps) revert BadFeeBounds();
        collector = collector_;
        MIN_FEE_BPS = minFeeBps;
        MAX_FEE_BPS = maxFeeBps;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_entered == 1) revert Reentrancy();
        _entered = 1;
        _;
        _entered = 0;
    }

    uint256 private _entered;

    // ---------------------------------------------------------------- admin

    /// @notice تسجيل حملة جديدة. المنصّة (owner) تنشئ الحملة فقط — ولا تستطيع
    ///         لاحقًا تغيير محفظة الجهة المستفيدة. تغيير العنوان من صلاحية المنظّم.
    function createCampaign(address charity, address organizer) external onlyOwner returns (uint256 id) {
        if (charity == address(0) || organizer == address(0)) revert BadAddress();
        id = nextCampaignId++;
        _campaigns[id] = Campaign({
            charity: charity,
            organizer: organizer,
            active: true,
            createdAt: uint64(block.timestamp)
        });
        emit CampaignCreated(id, charity, organizer);
    }

    /// @notice تغيير محفظة الجهة المستفيدة — **منظّم الحملة فقط**.
    ///         حتى لو سُرق مفتاح المنصّة، لا يمكنه تحويل أي تبرّع إلى محفظة أخرى.
    function setCharity(uint256 id, address charity) external {
        Campaign storage c = _campaigns[id];
        if (c.charity == address(0)) revert UnknownCampaign();
        if (msg.sender != c.organizer) revert NotOrganizer();
        if (charity == address(0)) revert BadAddress();
        c.charity = charity;
        emit CharityUpdated(id, charity, c.organizer);
    }

    /// @notice إيقاف الحملة مؤقتًا (لحماية المتبرّعين من حملة احتيال).
    ///         المنصّة تستطيع الإيقاف (لمنع الضرر) ولا تستطيع التحويل.
    function deactivate(uint256 id) external onlyOwner {
        Campaign storage c = _campaigns[id];
        if (c.charity == address(0)) revert UnknownCampaign();
        c.active = false;
        emit CampaignDeactivated(id);
    }

    /// @notice ضبط عتبات الرسوم المتدرّجة لرمز معيّن (بالوحدة الأصلية).
    ///         فعّل enabled=false للرجوع إلى الرسم الثابت ٩٪.
    function setTiers(
        address token,
        uint128 threshold1,
        uint128 threshold2,
        uint128 threshold3,
        bool enabled
    ) external onlyOwner {
        if (enabled) {
            if (threshold1 == 0 || threshold2 <= threshold1 || threshold3 <= threshold2) revert BadTiers();
        }
        tiers[token] = Tiers({
            enabled: enabled,
            threshold1: threshold1,
            threshold2: threshold2,
            threshold3: threshold3,
            updatedAt: uint64(block.timestamp)
        });
        emit TiersUpdated(token, threshold1, threshold2, threshold3, enabled);
    }

    /// @notice قراءة بيانات الحملة — عشوائية للجميع (شفافية).
    ///         تسمح لأي جهة بمقارنة ما تعرضه المنصة بما هو على السلسلة فعليًا.
    function campaign(uint256 id)
        external
        view
        returns (address charity, address organizer, bool active, uint64 createdAt)
    {
        Campaign storage c = _campaigns[id];
        return (c.charity, c.organizer, c.active, c.createdAt);
    }

    /// @notice نسبة الرسوم المطبَّقة على مبلغ معيّن لرمز معيّن.
    ///         النتيجة مقيّدة دائمًا ضمن [MIN_FEE_BPS, MAX_FEE_BPS].
    function feeFor(address token, uint256 amount) public view returns (uint16) {
        uint16 bps = FEE_TIER_1;
        Tiers storage t = tiers[token];
        if (t.enabled) {
            if (amount <= t.threshold1) bps = FEE_TIER_1;
            else if (amount <= t.threshold2) bps = FEE_TIER_2;
            else if (amount <= t.threshold3) bps = FEE_TIER_3;
            else bps = FEE_TIER_4;
        }
        if (bps > MAX_FEE_BPS) bps = MAX_FEE_BPS;
        if (bps < MIN_FEE_BPS) bps = MIN_FEE_BPS;
        return bps;
    }

    /// @notice سحب أي توكن أرسل بالخطأ إلى العقد — يُرسل إلى الكولكتر فقط.
    function sweep(address token, address to) external onlyOwner {
        if (token == address(0) || to == address(0)) revert BadAddress();
        uint256 amount = _balanceOf(token, address(this));
        if (amount > 0) {
            _push(token, to, amount);
            emit StrayTokensSwept(token, to, amount);
        }
    }

    // ------------------------------------------------------------ donations

    /// @notice تبرّع بالعملة الأصلية للشبكة.
    function donate(uint256 campaignId) external payable nonReentrant {
        Campaign storage c = _campaigns[campaignId];
        if (c.charity == address(0)) revert UnknownCampaign();
        if (!c.active) revert InactiveCampaign();
        uint256 gross = msg.value;
        if (gross == 0) revert ZeroAmount();

        uint16 feeBps = feeFor(address(0), gross);
        uint256 fee = (gross * feeBps) / BPS;
        uint256 toCharity = gross - fee;

        _pushNative(c.charity, toCharity);
        if (fee > 0) _pushNative(collector, fee);

        emit DonationReceived(campaignId, msg.sender, c.charity, address(0), gross, toCharity, fee, feeBps);
    }

    /// @notice تبرّع بتوكن ERC20 (يتطلب approve مسبقًا للعقد).
    function donateToken(uint256 campaignId, address token, uint256 amount) external nonReentrant {
        Campaign storage c = _campaigns[campaignId];
        if (c.charity == address(0)) revert UnknownCampaign();
        if (!c.active) revert InactiveCampaign();
        if (token == address(0)) revert BadAddress();
        if (amount == 0) revert ZeroAmount();

        // 1) اسحب من المتبرّع
        uint256 balanceBefore = _balanceOf(token, address(this));
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
        uint256 balanceAfter = _balanceOf(token, address(this));
        uint256 received = balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0;
        if (received == 0) revert ZeroAmount();

        // 2) قسّم المبلغ المستلم فعليًا بنسبة الشريحة المرتبطة بالمبلغ
        uint16 feeBps = feeFor(token, received);
        uint256 fee = (received * feeBps) / BPS;
        uint256 toCharity = received - fee;

        _push(token, c.charity, toCharity);
        if (fee > 0) _push(token, collector, fee);

        emit DonationReceived(campaignId, msg.sender, c.charity, token, received, toCharity, fee, feeBps);
    }

    // ------------------------------------------------------------- internals

    function _balanceOf(address token, address who) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(0x70a08231, who)
        );
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _push(address token, address to, uint256 amount) private {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _pushNative(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
