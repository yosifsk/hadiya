/* ترجمة عقد DonationSplitter.sol إلى bytecode بدون الحاجة لأدوات Foundry/Hardhat.
   الاستخدام: npm run compile:contracts  → ينتج contracts/build/DonationSplitter.json */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

const CONTRACTS_DIR = __dirname;
const BUILD_DIR = path.join(CONTRACTS_DIR, 'build');
const TARGET = 'DonationSplitter.sol';

function compile() {
  const source = fs.readFileSync(path.join(CONTRACTS_DIR, TARGET), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [TARGET]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage);
    throw new Error(`Solidity compile failed with ${errors.length} error(s)`);
  }
  for (const w of (output.errors || []).filter(e => e.severity === 'warning')) {
    console.warn(w.formattedMessage);
  }

  const compiled = output.contracts[TARGET].DonationSplitter;
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const artifact = {
    contractName: 'DonationSplitter',
    sourceName: TARGET,
    abi: compiled.abi,
    bytecode: '0x' + compiled.evm.bytecode.object,
    deployedBytecode: '0x' + compiled.evm.deployedBytecode.object,
    compiler: solc.version(),
    compiledAt: new Date().toISOString(),
  };
  const outFile = path.join(BUILD_DIR, 'DonationSplitter.json');
  fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2));
  console.log(`compiled ${TARGET} with solc ${solc.version()} → ${outFile}`);
  return artifact;
}

if (require.main === module) {
  try {
    compile();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { compile };
