/* ============================================================
   HADIYA — طبقة تبديل اللغة (عربي/إنجليزي)
   تبدّل النصوص[data-i18n] ويضبط اتجاه الصفحة.
   ============================================================ */

(() => {
  const EN = {
    brand_name: 'HADIYA',
    brand_name_en: 'Crypto donations',

    nav_discover: 'Discover',
    nav_how: 'How it works',
    nav_pricing: 'Pricing',
    nav_create: 'Start a fundraiser',
    nav_signin: 'Sign in',
    nav_register: 'Sign up',
    logout: 'Log out',
    register_title: 'Create your account',
    register_lead: 'A username and password account. You can link a wallet later — then your address owns your campaigns on-chain.',
    register_info: 'Already have an account? <a href="/login">Sign in</a> — or <a href="/sign-in">use your wallet</a> with no password at all.',
    username: 'Username',
    username_hint: 'Lowercase letters, digits, . _ - only (at least 3 characters).',
    display_name: 'Display name (optional)',
    password: 'Password',
    password_hint: 'At least 10 characters. Stored with Argon2id — we never keep the password itself.',
    password_confirm: 'Confirm password',
    create_account: 'Create account',
    login_title: 'Sign in',
    login_lead: 'Enter your username and password, or use your wallet with no password.',
    login_wallet_t: 'With a wallet',
    login_wallet_b: 'Sign one message — no transaction, no fees. Your address becomes your identity.',
    sign_in_wallet: 'Sign in with wallet',
    login_new_t: 'New account',
    login_new_b: 'Create a username and password, then link a wallet to manage your campaigns.',
    login_admin_note: 'Platform admin? The admin panel has its own sign-in at <a href="/admin">/admin</a> (admin account, key, or wallet signature).',
    account_link_required: 'Link your wallet — that address becomes the owner of your campaigns on-chain, and only you can change a beneficiary wallet.',
    account_linked: 'Your wallet is linked to this account:',
    link_wallet_t: 'Link a wallet',
    link_wallet: 'Link',

    hero_badge: 'Crypto donations',
    hero_title: 'Every donation goes straight to the beneficiary wallet',
    hero_lead: 'A blockchain donation platform: pick a campaign, connect your wallet, pay with ETH or USDC. The smart splitter sends 91% to the beneficiary and 9% to the platform in one transaction.',
    hero_cta1: 'Discover campaigns',
    hero_cta2: 'Start your campaign',
    hero_more: 'Technical details',
    hero_pricing: 'Fee table',
    split_title: 'How each donation is split',
    split_sub: 'Tiered fees: the larger the amount, the lower the rate',
    split_gross: 'Gross amount',
    split_charity: 'To the beneficiary wallet',
    split_fee: 'Platform fee (up to 9%)',
    split_total: 'Total delivered',
    split_note: 'The split happens inside the open-source DonationSplitter contract — your funds only ever touch your wallet, the beneficiary wallet and the platform wallet.',

    stat_raised: 'Total raised',
    stat_campaigns: 'Active campaigns',
    stat_donations: 'Confirmed donations',

    feat_title: 'Campaigns that need support',
    feat_sub: 'Recently published — every number confirmed on-chain',
    feat_all: 'View all',
    feat_empty: 'No campaigns yet. Start the first one.',
    of_goal: 'of',
    donors_word: 'donations',
    goal_word: 'goal',

    cat_title: 'Browse by category',
    cat_sub: 'Pick the sector closest to your cause',

    how_title: 'How the platform works',
    how_sub: 'Three clear steps, each verifiable on-chain',
    how_all: 'Full guide',
    how_1_t: 'Choose a campaign',
    how_1_b: 'Browse by category and read the story. Every campaign shows the beneficiary wallet address and network — check it before you donate.',
    how_2_t: 'Connect and pay',
    how_2_b: 'Pay with ETH or USDC. Tokens that need approval take one extra approve step — everything is shown before you confirm.',
    how_3_t: 'Track what arrives',
    how_3_b: 'Once confirmed on-chain, the transaction appears on the campaign page and the collector dashboard, with an independent explorer link.',

    trust_1_t: 'Your key never leaves your device',
    trust_1_b: 'We ask for a single message signature to sign in. We never ask for seeds and never store private keys.',
    trust_2_t: 'Numbers come from the chain',
    trust_2_b: 'Amounts are read from contract events after confirmation, never from numbers sent by the browser.',
    trust_3_t: 'Donation receipts',
    trust_3_b: 'Every donation has a transaction link and a wallet link anyone can verify independently.',

    search_btn: 'Search',
    results: 'results',
    no_results: 'No matching campaigns. Try another category or start your own.',
    funded: 'funded',
    goal: 'goal',

    verified: 'Verified',
    self_declared: 'Self-declared',
    organized_by: 'Organized by',
    open_dashboard: 'Campaign dashboard',
    tab_story: 'Story',
    tab_updates: 'Updates',
    tab_comments: 'Comments',
    tab_transparency: 'Transparency',
    no_updates: 'No updates yet.',
    no_comments: 'No comments yet — be the first supporter.',
    post_comment: 'Post',
    transparency_t: 'Where your money goes',
    transparency_1: 'Every donation is one on-chain transaction; no funds ever sit in a platform account.',
    transparency_2: 'The 9% fee is frozen inside the contract and cannot be changed after deployment.',
    transparency_3: 'The platform wallet is an immutable variable inside the contract.',
    transparency_4: 'Every donation emits a public event anyone can check on an explorer.',
    lbl_charity_wallet: 'Beneficiary wallet (receives 91%)',
    lbl_collector_wallet: 'Collector wallet (receives 9%)',
    lbl_splitter: 'Splitter contract (DonationSplitter)',
    splitter_campaign_id: 'Campaign id inside the contract',
    fee_onchain: 'Contract fee on-chain',
    collector_onchain: 'Collector in contract',
    lbl_wallet_balance: 'Actual balance in the beneficiary wallet',
    balance_note: 'Balance does not isolate this campaign from older funds — check the donation log below.',
    view_on_explorer: 'View on explorer',
    recent_donations: 'Recent donations',
    no_donations: 'No confirmed donations yet. Be the first supporter.',

    donate_now: 'Donate now',
    donate_pending: 'Pending review',
    donate_closed: 'Campaign closed',
    supported_tokens: 'Supported tokens',
    tokens_note: 'Payment happens on the campaign network and is sent straight to the beneficiary wallet.',
    campaign_facts: 'Campaign facts',
    created_at: 'Created',
    goal_value: 'Goal',
    donations_count: 'Donations',
    network: 'Network',
    settlement_method: 'Settlement',
    share: 'Share',
    copy_link: 'Copy link',
    copy_url: 'Copy page URL',

    donate_title: 'Donate to this campaign',
    choose_amount: 'Choose an amount',
    choose_token: 'Currency',
    gross_amount: 'Gross amount',
    fee_label: 'Platform fee (max rate)',
    tier_note: 'Tiered fees — the rate drops as the amount grows',
    tier_units_note: 'Tier thresholds are stored in the contract in token units at the time they were set. They track USD exactly for USDC, and may drift with the price of volatile assets (refreshed periodically).',
    tier_title: 'Tiered fees by donation amount',
    tier_sub: 'The bigger the donation, the lower the fee. The rate is enforced inside the on-chain contract: neither the donor nor the platform can go around it.',
    th_tier: 'Tier',
    th_amount_range: 'Donation amount',
    to_charity: 'To the beneficiary',
    arrives_wallet: 'Lands in the wallet',
    raised_of: 'Raised from',
    price_unavailable: 'USD price unavailable right now — check the raw amounts below',
    your_name: 'Your name (shown to supporters)',
    message_optional: 'Message (optional)',
    hide_name: 'Hide my name (shown as "anonymous supporter")',
    pay_now: 'Pay now',
    crypto_warning: '⚠️ Crypto payments cannot be refunded. Verify the address and amount before confirming.',

    create_title: 'Start a fundraiser',
    create_lead: 'You do not need a wallet with us — the money goes from the donor wallet directly to the beneficiary wallet. You will need the beneficiary wallet address so the money reaches you.',
    f_title: 'Campaign title',
    f_subtitle: 'One line describing the situation',
    f_story: 'The story',
    f_story_hint: 'Text only: no wallet address (0x…) may appear in the title, subtitle or story. The wallet address goes in its own field below.',
    f_en_title: 'English version (optional)',
    f_en_note: 'Shown to visitors who pick the English interface. If left empty, the Arabic version is shown.',
    f_en_title_label: 'Title in English',
    f_en_sub: 'One-line description in English',
    f_en_story: 'Story in English',
    create_wallet_rule: 'Putting any wallet address inside the campaign text (title, subtitle, story or updates) is not allowed. The address belongs only in the beneficiary wallet field below, where everyone can verify it on the campaign page.',
    f_goal: 'Goal in USD',
    f_category: 'Category',
    f_chain: 'Network',
    f_token: 'Preferred token',
    f_charity: 'Beneficiary wallet (receives 91%)',
    f_charity_hint: 'A valid EVM address (0x… 40 chars). Every donation lands directly on this address.',
    f_org: 'Organizer name',
    f_country: 'Country',
    f_cover: 'Cover image URL (optional)',
    f_accent: 'Progress bar color',
    create_info: 'Every new campaign goes to the review queue and is neither listed publicly nor able to receive donations until the platform team approves it. Full verification (the "verified" badge) needs an extra document review.',
    publish: 'Publish',

    dash_title: 'Campaign dashboard',
    view_public: 'View public page',
    collector_panel: 'Collector dashboard',
    kpi_raised: 'Raised (confirmed)',
    kpi_goal: 'Goal',
    kpi_fee: 'Platform fee (tiered, up to 9%)',
    kpi_fee_sub: 'Collected inside the donation transaction',
    kpi_net: 'Net to beneficiary',
    receive_at: 'Funds land here',
    reading_balance: 'Reading balance…',
    chain: 'Network',
    settlement: 'Settlement method',
    via_contract: 'Transfer through the smart contract',
    splitter_note: 'The platform fee is recorded as "unsettled" and must be collected separately.',
    direct_note: 'Transfer goes straight to the beneficiary wallet. The 9% platform fee is recorded as "unsettled" and must be collected separately.',
    add_update: 'Post an update',
    donations_table: 'Donation log',
    th_donor: 'Donor',
    th_amount: 'Amount',
    th_net: 'Net',
    th_fee: 'Fee',
    th_status: 'Status',
    th_tx: 'Transaction',
    th_date: 'Date',
    confirmed: 'Confirmed',
    pending: 'Pending',
    failed: 'Failed',

    collector_title: 'Collector dashboard',
    collector_sub: 'Everything that reached the platform and the beneficiaries — read straight from the chain',
    refresh: 'Refresh',
    kpi_gross: 'Total raised (all campaigns)',
    kpi_charity: 'Net to beneficiaries (91%)',
    kpi_charity_sub: 'Went directly to the wallets',
    kpi_unsettled: 'Unsettled fees',
    kpi_unsettled_sub: 'Direct donations that need collecting',
    collector_wallet: 'Collector wallet',
    collector_note: 'This is the wallet the contract sends the 9% to. The address is frozen inside the contract.',
    splitter_contract: 'Splitter contract',
    splitter_note: 'Deployed on Base / Base Sepolia. The fee rate is fixed (900 bps = 9%) after deployment.',
    live_balances: 'Live balances',
    reading: 'Reading from the chain…',
    by_token: 'Raised by token',
    review_queue: 'Review queue',
    th_charity_wallet: 'Beneficiary wallet',
    th_goal: 'Goal',
    th_actions: 'Actions',
    loading: 'Loading…',
    approve: 'Approve',
    reject: 'Reject',
    tiers_used: 'Donations by fee tier',
    th_rate: 'Fee rate',
    th_count: 'Donations',
    by_campaign: 'By campaign',
    th_chain: 'Network',
    th_symbol: 'Token',
    th_gross: 'Gross',
    th_charity: 'Net 91%',
    th_campaign: 'Campaign',
    th_raised: 'Raised',
    th_donors: 'Donors',
    ledger: 'Platform ledger',
    th_type: 'Type',
    th_note: 'Note',
    no_data: 'No data yet.',

    pricing_title: 'Platform fees',
    pricing_lead: 'One flat fee per donation. No fee to create a campaign and no fee to post updates.',
    kpi_create_fee: 'Campaign creation fee',
    kpi_create_sub: 'Unlimited, no email needed',
    kpi_update_fee: 'Updates fee',
    kpi_update_sub: 'Post as much as you want',
    kpi_tx_fee: 'Transaction fee',
    kpi_tx_sub: 'Maximum rate — it drops as the amount grows',
    tier_title: 'Tiered fees by donation amount',
    tier_sub: 'The bigger the donation, the lower the fee. The rate is enforced inside the on-chain contract: neither the donor nor the platform can go around it.',
    tier_note: 'Thresholds are set inside the contract per token and refreshed with the exchange rate. The minimum fee is 3% and cannot go below it.',
    calc_title: 'Do the math',
    calc_amount: 'Donation amount (USD)',
    calc_currency: 'Currency',
    compare_title: 'Quick comparison',
    th_total: 'Total',
    th_platform: 'Platform fee',
    pricing_warn: 'Network gas is paid by the donor on top of the platform fee and varies with network congestion. Crypto payments are also irreversible — read the Terms before donating.',

    hiw_title: 'How the platform works',
    hiw_lead: 'The platform holds no funds between donations. Every donation is a separate on-chain transaction.',
    hiw_1_t: '1. Choose a campaign',
    hiw_1_b: 'Every campaign page shows the beneficiary wallet address, network, supported tokens and whether it is verified or self-declared. Verify the address on an explorer before paying.',
    hiw_2_t: '2. Connect your wallet',
    hiw_2_b: 'The browser requests one message signature for sign-in (no transaction, no charge). Without a browser wallet you can send the amount directly to the address from your wallet app.',
    hiw_3_t: '3. Pay',
    hiw_3_b: 'Tokens that need approval add one extra step before the transfer — amount and address are shown before you confirm in your wallet.',
    hiw_4_t: '4. The amount is split on-chain',
    hiw_4_b: 'The donor calls donate() in the DonationSplitter contract, which moves 91% to the beneficiary and 9% to the platform in the same transaction.',
    hiw_5_t: '5. The log updates',
    hiw_5_b: 'The server watches the DonationReceived event after the block is confirmed and updates the campaign page and collector dashboard — numbers never come from the browser.',
    hiw_6_t: '6. Verify it yourself',
    hiw_6_b: 'Every donation has a transaction link and a wallet link on a block explorer. Check them independently of the platform.',
    hiw_contract_t: 'The smart contract',
    hiw_contract_b: 'Written in Solidity and open source, with the fee rate (900 bps = 9%) and the platform wallet frozen in the bytecode. There is no function to change the fee after deployment — by design: the donor knows the rate before paying.',
    hiw_limits_t: 'Limits you should know',
    lim_1: 'No automatic refunds: crypto payments are final.',
    lim_2: 'USD values are estimates refreshed from public sources and may differ at execution time.',
    lim_3: 'Crypto donations may create a tax liability for the donor depending on their country.',
    lim_4: 'The "verified" badge is granted after a document review, not automatically.',
    lim_5: 'The platform never holds funds on your behalf.',

    signin_title: 'Create your account',
    signin_lead: 'Your account on this platform IS your wallet address — no password, no email, no seed phrase. We ask for a single message signature; nothing is sent and nothing is charged.',
    signin_btn: 'Sign and create account',
    signin_create_reason: 'Creating a campaign needs an account — one step: sign a message with your wallet, then you continue right where you were.',
    signin_continue: 'After signing you will return automatically to the page you requested.',
    why_title: 'Why no password?',
    why_body: 'Passwords get stored, stolen and reused. A wallet signature cannot be copied or used elsewhere — so we never store any secret of yours.',
    why_title2: 'What does this mean for you?',
    why_body2: 'Your address becomes your identity: it owns your campaigns, it signs any change of the beneficiary wallet, and it appears in the donation log under your name.',
    why_title3: 'Privacy',
    why_body3: 'Your address is public on the network anyway. We keep it only to link you to your campaigns and donations, and we share it with nobody.',
    account_title: 'My account',
    account_identity: 'Your identity on the platform',
    account_note: 'This address is your account: it owns your campaigns, it signs any change of the beneficiary wallet (nobody else can), and it shows your donations. No password, no email — just a wallet.',
    account_campaigns: 'My campaigns',
    account_raised: 'Raised in my campaigns',
    account_donations: 'My donations',
    account_verified: 'Verified campaigns',
    account_pending: 'pending review',
    account_empty: 'No campaigns yet. Start the first one — it goes to the review queue, then gets published.',
    account_no_donations: 'You have not donated through this platform yet.',
    create_owner: 'Campaign organizer (its owner on-chain):',
    wallet_address: 'Wallet address',
    signin_hint: 'Your browser will ask you to sign a message — no transaction is sent and nothing is charged.',
    read_from_wallet: 'Read address from wallet',
    signin_btn: 'Sign and sign in',
    signin_info: 'Using the platform means agreeing to the Terms and the Privacy Policy.',

    t_1: 'Nature of the service',
    t_1_b: 'The platform provides tools to publish fundraising campaigns and connect them to crypto payments on EVM networks. It does not control or execute funds on your behalf and never holds donor or beneficiary funds.',
    t_2: 'Fees',
    t_2_b: 'The platform fee is 9% of each donation, deducted inside a single on-chain transaction. There is no fee to create a campaign or post updates. Network gas is paid by the donor.',
    t_3: 'Irreversibility',
    t_3_b: 'Crypto payments cannot be reversed. Any refund is a new transaction from the platform or beneficiary wallet and cannot be guaranteed. Verify the address and amount before confirming.',
    t_4: 'Content and campaigns',
    t_4_b: 'Campaign creators are responsible for the accuracy of their information. The "verified" badge means the team reviewed specific documents; it is not a financial audit or a guarantee. Campaigns that violate the rules may be suspended.',
    t_5: 'Donor responsibilities',
    t_5_b: 'You are responsible for the wallet address you submit, your balance and the transactions you sign. The platform is not liable for lost passwords, devices or apps it does not control.',
    t_6: 'Privacy',
    t_6_b: 'We store the public address linked to your donations and the donation log to display campaign history. See the Privacy Policy.',
    t_7: 'Law',
    t_7_b: 'These terms are governed by the laws of the registered entity address. Crypto use may be subject to tax or anti-money-laundering rules in your country — consult a professional.',

    p_1_t: 'What we collect',
    p_1_b: 'Your public wallet address (linked to your session and your donations)',
    p_2_b: 'An optional name and an optional message you send with a donation',
    p_3_b: 'The campaign donation log (transaction, token, amount, time) — already public on-chain',
    p_4_b: 'A signed nonce per session (valid until the session expires)',
    p_5_t: 'What we do not collect',
    p_5_b: 'We never ask for seed phrases, never store private keys and never run a custodial wallet service.',
    p_6_b: 'We send no marketing email and share no data with third parties.',
    p_7_b: 'We hold no funds — there are no internal balances on the platform.',
    p_8_t: 'Cookies',
    p_8_b: 'One session cookie (HttpOnly + SameSite=Lax) plus localStorage for the language preference only.',
    p_9_t: 'Your rights',
    p_9_b: 'You can request deletion of your account and records. Note that donation data already lives on the public network and cannot be removed from there.',

    ipfs_note: 'A copy of this story is pinned on IPFS — it stays readable even if the site changes:',
    admin_title: 'Admin panel',
    admin_signed_as: 'Signed in as',
    admin_security_note: 'Every sensitive action here is written to the audit log. Changing a beneficiary wallet is NOT possible from here — the campaign organizer must sign it in their own wallet (the contract enforces this on-chain).',
    admin_tab_overview: 'Overview',
    admin_tab_fees: 'Fees',
    admin_tab_review: 'Review campaigns',
    admin_tab_db: 'Database',
    admin_tab_integrity: 'Integrity check',
    admin_tab_audit: 'Audit log',
    admin_tab_security: 'Security',
    admin_onchain: 'On-chain contract',
    admin_campaigns: 'Campaigns',
    admin_donations: 'Donations',
    admin_fees_onchain: 'On-chain bounds (immutable)',
    admin_fees_effective: 'Effective tiers now',
    admin_fees_apply: 'Apply on-chain',
    admin_fees_apply_note: 'On-chain tiers are set in token units via setTiers. After saving run:',
    admin_edit_tiers: 'Edit fee tiers',
    admin_fees_limits: 'You cannot exceed the contract bounds (min/max immutable). Changing tiers requires running npm run set:tiers after saving.',
    admin_db_stats: 'Database stats',
    admin_integrity: 'Integrity check',
    admin_sessions: 'Active sessions',
    admin_rotate_key: 'Rotate admin key',
    new_key: 'New key (at least 16 chars)',
    rotate: 'Rotate',
    revoke_all: 'Revoke all sessions',
    admin_addresses: 'Admin addresses',
    addresses_list: 'Address list (comma separated)',
    admin_accounts: 'Admin accounts',
    admin_addresses_note: 'Only these addresses can sign in with a wallet, even if the admin key leaks.',
    new_account: 'New account',
    create_account: 'Create + generate password',
    change_password: 'Change my password',
    current_password: 'Current password',
    new_password: 'New password',
    tab_account: 'Account (username + password)',
    tab_key: 'Admin key',
    tab_wallet: 'Wallet signature',
    username: 'Username',
    password: 'Password',
    login_password_note: 'Passwords are stored with Argon2id (64 MiB, 3 iterations) with a unique salt and a server-side "pepper". After 5 failed attempts the account locks for 15 minutes, and every attempt is written to the audit log.',
    admin_login_title: 'Admin sign-in',
    admin_login_lead: 'The panel is protected by an admin key or a signature from an admin wallet.',
    admin_key: 'Admin key',
    admin_key_hint: 'The key is compared in constant time. After sign-in it is stored in an HttpOnly cookie and removed from the URL.',
    sign_in: 'Sign in',
    admin_login_wallet_note: 'Alternative: sign in with your wallet from the sign-in page if your address is on the admin list.',
    admin_login_security: 'Never send the key through a link or a message. Every sign-in attempt and admin action is written to the audit log.',
    run_check: 'Run check',
    load: 'Load',
    save: 'Save',
    reset: 'Reset',
    th_time: 'Time',
    th_actor: 'Actor',
    th_action: 'Action',
    th_target: 'Target',
    th_ip: 'IP',
    th_organizer: 'Organizer',
    th_status: 'Status',
    nav_faq: 'FAQ',
    faq_title: 'Frequently asked questions',
    faq_lead: 'What users ask most — every answer is based on how the system actually behaves.',
    faq_item: 'Question',
    faq_no_results: 'No matching results.',
    faq_assistant_cta: 'Did not find your answer? Ask the assistant at the bottom of the page, or contact support at',
    export_csv: 'Export CSV',
    admin_users: 'Users',
    admin_settings: 'Platform settings',
    collector_address: 'Collector wallet',
    collector_locked: 'Fixed (immutable) inside the contract — changing it here does not change the contract.',
    owner_address: 'Owner address',
    donations_word: 'donations',
    fee_note: 'Deducted inside the same on-chain transaction — never charged from your account later.',
    privacy_title: 'Privacy policy',
    terms_title: 'Terms of use',
    f_delivery: 'Delivery address',
    f_delivery_sign: 'Sign & prove the address',
    f_delivery_hint: 'The address where the funds actually land (the recipient or the delivering organisation). We request one signature from your wallet to prove ownership — without it the field is rejected.',
    f_organizer_wallet: 'Organizer wallet (proof of ownership)',
    f_organizer_sign: 'Sign & prove ownership',
    f_organizer_hint: 'Organizer wallet: sign with that same address when saving. If you skip it now, your campaign is reviewed first and we then ask you to sign to complete publishing.',
    awaiting_signature_owner: 'Your campaign was reviewed and approved. One last step: add the organizer wallet and sign with that address to complete publishing.',
    awaiting_signature_others: 'This campaign was reviewed and approved, and is waiting for the organizer signature to complete publishing.',
    sign_now: 'Sign & send for review',
    f_impact: 'Impact levels',
    f_impact_hint: 'Link each amount to a concrete outcome ("$25 covers a month of medicine for one patient"). These cards appear to visitors, and clicking one sets the donation amount automatically.',
    f_impact_add: '+ Add a level',
    f_impact_suggest: 'Suggest from fee tiers',
    impact_title: 'Impact levels',
    remove: 'Remove',
    discover_title: 'Discover campaigns',
    not_found: 'Page not found.',
    pending_review_banner: 'This campaign is under review and is not published to the public yet.',
    rejected_banner: 'This campaign was rejected by the review team.',
    closed_banner: 'This campaign is closed and no longer accepts donations.',
    back_home: 'Back to home',
    server_error: 'Something went wrong. It has been logged.',
    forbidden: 'This page is restricted.',
    // ===== عنوان الاستلام =====
    // ===== عنوان الاستلام =====
    forgot_title: "Forgot your password?",
    forgot_lead: "Enter your username and we will send you a one-time link to reset your password.",
    forgot_submit: "Send the reset link",
    forgot_sent: "If the account exists, we sent it a reset link valid for 30 minutes. Check your inbox — and request a new one if it is not there.",
    forgot_hint: "Enter the username you registered with.",
    forgot_again: "Request a new link",
    forgot_wallet_note: "If you sign in with a wallet only, you need no password — ",
    forgot_link: "Forgot password?",
    back_to_login: "Back to sign in",
    reset_title: "Set a new password",
    reset_lead: "The new password is stored with Argon2id, and all your previous sessions end.",
    reset_note: "After the change you will be signed out everywhere — sign in again.",
    save_new_password: "Save the new password",
    demo_data: "Demo credentials",
    demo_data_hint: "The demo admin account — press “Autofill” to fill the form.",
    fill: "Autofill",
    generate_password: "Generate a strong password",
    or_separator: "or",
    register_google: "Or sign in with your Google account",
    menu_label: "Menu",
  };

  const STORAGE_KEY = 'hadba_lang';

  /* قاموس العبارات (عربي → إنجليزي) — يُحمَّل من ملفات منفصلة،
     مع المصطلحات الديناميكية المولَّدة (فئات/شبكات/هوية). */
  const PHRASES = Object.assign(
    {},
    (typeof window !== 'undefined' && window.HADIYA_LABELS) || {},
    (typeof window !== 'undefined' && window.HADIYA_APP_PHRASES) || {},
    (typeof window !== 'undefined' && window.HADIYA_PHRASES) || {}
  );

  /* ترتيب العبارات: الأطول أولًا حتى لا تُقتطع العبارات الطويلة */
  const SORTED_PHRASES = Object.keys(PHRASES)
    .filter(k => /[\u0600-\u06FF]/.test(k))
    .sort((a, b) => b.length - a.length);

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ترجمة نصّ واحد: مطابقة تامة أولًا، ثم استبدال جزئي بحدود كلمات */
  function translateText(text) {
    if (!text) return text;
    const key = text.replace(/\s+/g, ' ').trim();
    if (PHRASES[key]) return PHRASES[key];

    let out = text;
    for (const ar of SORTED_PHRASES) {
      if (out.indexOf(ar) === -1) continue;
      // حدود كلمات: لا نمسّ جزءًا من كلمة أخرى
      const re = new RegExp(`(?<![؀-ۿ])${escapeRegExp(ar)}(?![؀-ۿ])`, 'g');
      out = out.replace(re, PHRASES[ar]);
    }
    return out;
  }

  /* استبدال كل نصوص الصفحة التي تطابق القاموس تمامًا */
  function translateTree(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('script, style, code, pre, textarea, .mono, .en-label')) return NodeFilter.FILTER_REJECT;
        // محتوى المستخدم (حملة/قصة) يُعرض بنسخته التي رسمها الخادم — لا نلمسه
        if (parent.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        if (!/[؀-ۿ]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = node.nodeValue;
      const trimmed = original.trim();
      const translated = translateText(trimmed);
      if (translated !== trimmed) {
        const idx = original.indexOf(trimmed);
        const lead = idx >= 0 ? original.slice(0, idx) : '';
        const tail = idx >= 0 ? original.slice(idx + trimmed.length) : '';
        node.nodeValue = `${lead}${translated}${tail}`;
        // عقد النصوص لا تملك dataset — نخزّن الأصل كخاصية على العقد نفسها
        if (node.__i18nOrig === undefined) node.__i18nOrig = original;
      }
    }
  }

  /* يعيد النص الأصلي (العربي) لكل ما حُوِّل */
  function restoreTree(root) {
    if (!root || !document.createTreeWalker) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.__i18nOrig === undefined ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      node.nodeValue = node.__i18nOrig;
      delete node.__i18nOrig;
    }
  }

  /* ترجمة سمات (placeholder / title / aria-label) لعنصر وكل أبنائه */
  function translateAttrs(root) {
    if (!root || !root.querySelectorAll) return;
    const list = [];
    if (root.matches && root.matches('[placeholder],[title],[aria-label]')) list.push(root);
    list.push(...root.querySelectorAll('[placeholder],[title],[aria-label]'));
    for (const el of list) {
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        if (!el.hasAttribute(attr)) continue;
        const store = `i18nOrig${attr.replace('-', '')}`;
        if (!el.dataset[store]) el.dataset[store] = el.getAttribute(attr) || '';
        const original = el.dataset[store];
        const translated = translateText(original);
        if (translated !== original) el.setAttribute(attr, translated);
      }
    }
  }

  /* أي نصّ يضيفه JavaScript لاحقًا (لوحة الإدارة، التبرّع…) يُترجم تلقائيًا */
  let currentLang = 'ar';

  function observeDom() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    const observer = new MutationObserver((mutations) => {
      if (currentLang !== 'en') return;
      for (const m of mutations) {
        if (m.type === 'attributes') {
          const el = m.target;
          const attr = m.attributeName;
          if (attr === 'placeholder' || attr === 'title' || attr === 'aria-label') {
            const val = el.getAttribute(attr) || '';
            const translated = translateText(val);
            if (translated !== val) el.setAttribute(attr, translated);
          }
          continue;
        }
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentElement && node.parentElement.closest('[data-no-i18n]')) continue;
            const original = node.nodeValue;
            const translated = translateText(original.trim());
            if (translated !== original.trim() && original.trim()) {
              node.nodeValue = translated;
              if (node.__i18nOrig === undefined) node.__i18nOrig = original;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.closest('[data-no-i18n]')) continue;
            translateTree(node);
            translateAttrs(node);
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
  }

  function applyLanguage(lang) {
    const isEn = lang === 'en';
    currentLang = isEn ? 'en' : 'ar';

    // 1) نرجع للأصل (عربي) ثم نطبّق الترجمة
    restoreTree(document.body);
    for (const el of document.querySelectorAll('[data-i18n]')) {
      if (!el.dataset.i18nOrigKey) el.dataset.i18nOrigKey = el.textContent.trim();
    }
    for (const el of document.querySelectorAll('[data-i18n]')) {
      const key = el.getAttribute('data-i18n');
      const original = el.dataset.i18nOrigKey || '';
      el.textContent = isEn ? (EN[key] || original) : original;
    }

    // 2) قاموس العبارات على كل النصوص
    if (isEn) translateTree(document.body);

    // 2b) السمات العامة (placeholder / title / aria-label) بلا مفاتيح data-i18n
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const store = `i18nOrig${attr.replace('-', '')}`;
        if (!el.dataset[store]) el.dataset[store] = el.getAttribute(attr) || '';
        const original = el.dataset[store];
        el.setAttribute(attr, isEn ? translateText(original) : original);
      }
    }

    // 3) خصائص HTML
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
      if (!el.dataset.i18nOrigPlaceholder) el.dataset.i18nOrigPlaceholder = el.getAttribute('placeholder') || '';
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', isEn ? (PHRASES[key] || el.dataset.i18nOrigPlaceholder) : el.dataset.i18nOrigPlaceholder);
    }
    for (const el of document.querySelectorAll('[data-i18n-title]')) {
      if (!el.dataset.i18nOrigTitle) el.dataset.i18nOrigTitle = el.getAttribute('title') || '';
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', isEn ? (PHRASES[key] || el.dataset.i18nOrigTitle) : el.dataset.i18nOrigTitle);
    }
    for (const el of document.querySelectorAll('[data-i18n-aria]')) {
      if (!el.dataset.i18nOrigAria) el.dataset.i18nOrigAria = el.getAttribute('aria-label') || '';
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', isEn ? (PHRASES[key] || el.dataset.i18nOrigAria) : el.dataset.i18nOrigAria);
    }

    document.documentElement.lang = isEn ? 'en' : 'ar';
    document.documentElement.dir = isEn ? 'ltr' : 'rtl';

    // نُخزّن اللغة في كوكي حتى يرسمها الخادم بنفس الشكل عند الطلب التالي
    try {
      document.cookie = `hadba_lang=${lang}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* ignore */ }

    document.querySelectorAll('.lang-toggle button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent('hadiya:lang', { detail: { lang } }));
  }

  /* helper للاستخدام في JS:
     t('مفتاح EN') → الإنجليزية دائمًا (مفاتيح قاموس EN)
     t('نص عربي')  → ترجمته إذا كانت الواجهة إنجليزية */
  function t(key, fallback) {
    if (EN[key]) return EN[key];
    if (currentLang === 'en' && PHRASES[key]) return PHRASES[key];
    return fallback !== undefined ? fallback : key;
  }

  window.HadiyaI18n = { applyLanguage, EN, PHRASES, t, translateText };

  document.addEventListener('DOMContentLoaded', () => {
    // الكوكي هو المرجع (الخادم يرسم بنفس اللغة)، ثم التخزين المحلي، ثم لغة الصفحة
    const cookie = document.cookie.match(/(?:^|;\s*)hadba_lang=(en|ar)/);
    let saved = cookie ? cookie[1] : null;
    if (!saved) {
      try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    if (!saved) saved = document.documentElement.lang === 'en' ? 'en' : 'ar';
    applyLanguage(saved);
    observeDom();

    document.querySelectorAll('.lang-toggle button').forEach(btn => {
      btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
    });
  });
})();
