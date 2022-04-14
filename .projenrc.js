const { awscdk } = require('projen');
const { JobPermission } = require('projen/lib/github/workflows-model');
const { NodePackageManager } = require('projen/lib/javascript');
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
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
  scripts: {
    lint: 'cfn-lint cdk.out/**/*.template.json -i W3005 W2001',
  },
  postBuildSteps: [ // After release build
    {
      name: 'Copy cdk.out to dist',
      run: 'cp -r cdk.out dist/cdk.out',
    },
  ],
});

/**
 * Add couldformation lint job to build workflow
 * Note: Not ideal as we would like to incldue the lint step in the
 * buidl process, however the setup of the linter cannot be added to
 * the existing workflow nor can the build task be altered.
 *
 * Currently using the dist folder to store the cloudformation templates
 * A neater alternative is the artifactsDirectory configuration option,
 * however changing the artifactsDirectory breaks the release build workflow.
 */
project.buildWorkflow.addPostBuildJob('CloudFormation-lint', {
  runsOn: ['ubuntu-latest'],
  permissions: {
    contents: JobPermission.READ,
  },
  steps: [
    {
      name: 'Setup Cloud Formation Linter with Latest Version',
      uses: 'scottbrenner/cfn-lint-action@v2',
    },
    {
      name: 'Restore cdk.out directory',
      run: 'cp -r dist/cdk.out cdk.out',
    },
    {
      name: 'Run cfn-lint',
      run: 'npx projen lint', // Lint script should be present in .projenrc.js
    },
  ],
});

project.synth();