/* تخزين محتوى الحملة على IPFS (عبر Pinata) — اختياري.
 *
 *   PINATA_JWT=<jwt> npm run ipfs:pin -- --slug=hlth-aml
 *
 * يخزّن مستند JSON (القصة + بيانات الحملة) على IPFS، ويطبع الـ CID.
 * الـ CID يُحفظ في قاعدة البيانات (campaigns.story_cid) فيُعرض على صفحة الحملة
 * مع رابط gateway — فيمكن للمتبرّعين قراءة المحتوى من شبكة لا تتحكّم بها المنصة. */

require('dotenv').config();

const { q, one, run } = require('../src/db');

const PINATA_API = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

function pickArg(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
}

async function main() {
  const jwt = (process.env.PINATA_JWT || '').trim();
  if (!jwt) {
    console.error('PINATA_JWT is missing. Get a free JWT at https://app.pinata.cloud/developers/api-keys');
    process.exit(1);
  }

  const slug = pickArg('slug');
  const campaign = slug
    ? one('SELECT * FROM campaigns WHERE slug = ?', slug)
    : q('SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 1')[0];

  if (!campaign) {
    console.error('campaign not found — pass --slug=<slug>');
    process.exit(1);
  }

  const document = {
    slug: campaign.slug,
    title: campaign.title,
    subtitle: campaign.subtitle,
    story: campaign.story,
    category: campaign.category,
    goal_usd: campaign.goal_usd,
    charity_wallet: campaign.charity_wallet,
    chain_id: campaign.chain_id,
    token_symbol: campaign.token_symbol,
    organizer_name: campaign.organizer_name,
    country: campaign.country,
    created_at: campaign.created_at,
    version: 1,
  };

  const res = await fetch(PINATA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({
      pinataContent: document,
      pinataMetadata: { name: `hadiya-campaign-${campaign.slug}` },
    }),
  });

  if (!res.ok) {
    console.error('pinata error', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const cid = data.IpfsHash;
  run('UPDATE campaigns SET story_cid = ? WHERE id = ?', cid, campaign.id);

  console.log('\n=== تم النشر على IPFS ===');
  console.log(`CID:    ${cid}`);
  console.log(`الرابط: ${GATEWAY}${cid}`);
  console.log(`حُفظ في campaigns.story_cid (id=${campaign.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
