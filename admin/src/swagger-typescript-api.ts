import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'path';
config();

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

/**
 * Hämtar backendens swagger och genererar API-klienten. Kräver körande backend.
 *
 * Tidigare version await:ade `exec` (en no-op — exec returnerar en ChildProcess,
 * inte en promise) så genereringen startade innan curl skrivit klart filen, och
 * använde v12-syntaxen utan `generate`-kommandot som swagger-typescript-api v13
 * kräver. Synkrona anrop gör ordningen garanterad och fel högljudda.
 */
const main = () => {
  const outputDir = `${PATH_TO_OUTPUT_DIR}/backend`;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const swaggerUrl = `${process.env.NEXT_PUBLIC_API_URL}${process.env.NEXT_PUBLIC_API_PATH}/swagger.json`;
  const swaggerFile = `${outputDir}/swagger.json`;

  console.log(`Downloading ${swaggerUrl}`);
  execFileSync('curl', ['-sf', '-o', swaggerFile, swaggerUrl], { stdio: 'inherit' });

  console.log('Generating data contracts');
  execFileSync(
    'npx',
    ['swagger-typescript-api', 'generate', '--modular', '-p', swaggerFile, '-o', outputDir, '--axios', '--clean-output'],
    { stdio: 'inherit' }
  );
};

main();
