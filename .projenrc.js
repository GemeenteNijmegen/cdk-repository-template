const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  projenVersion: '0.54.14',
  cdkVersion: '2.16.0',
  license: 'EUPL-1.2',
  name: 'cdk-repository-template',
  release: true,
  defaultReleaseBranch: 'production',
  majorVersion: 0,
  depsUpgradeOptions: {
    workflowOptions: {
      branches: ['acceptance'],
    },
  },
  scripts: {
    lint: 'cfn-lint cdk.out/**/*.template.json -i W3005 W2001',
  },
  deps: [
    'cdk-nag@^2.0.0',
  ],
  gitignore: [
    'test-reports/junit.xml',
    'test/__snapshots__/*',
    '.env',
    '.vscode',
    '.DS_Store',
  ],
  workflowBootstrapSteps: [
    {
      name: 'Setup cfn-lint',
      uses: 'scottbrenner/cfn-lint-action@v2',
    },
  ],
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

/**
 * Prevent suppression of output of cdk synth step for two reasons
 * - MFA code question when AWS_PROFILE env. variable is set
 * - Show cfn-nag output during synth step.
 */
const synth = project.tasks.tryFind('synth:silent');
synth.reset();
synth.exec('cdk synth -q');

/**
 * Add cfn-lint step to build after compiling.
 */
const postCompile = project.tasks.tryFind('post-compile');
const lint = project.tasks.tryFind('lint');
postCompile.spawn(lint);

project.synth();
