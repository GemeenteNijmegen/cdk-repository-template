const { awscdk } = require('projen');
const { JobPermission } = require('projen/lib/github/workflows-model');

const project = new awscdk.AwsCdkTypeScriptApp({
  projenVersion: '0.54.34',
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
  postBuildSteps: [
    {
      name: 'Save CloudFormation templates',
      run: 'mkdir -p dist && cp cdk.out/* dist/'
    },
    /*{
      name: 'Save CloudFormation templates',
      uses: 'actions/upload-artifact@v3',
      with: {
        name: 'build-templates',
        path: 'cdk.out',
      },
    },
    {
      name: 'Dummy file in dist to prevent workflow from failing',
      run: 'mkdir -p dist && touch dist/dummy'
    }*/
  ]
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

/**
 * Add cfn-lint step to build after compiling.
 */
const postCompile = project.tasks.tryFind('post-compile');
const lint = project.tasks.tryFind('lint');
postCompile.spawn(lint);


// project.buildWorkflow.addPostBuildSteps([]); // Contains a bug in the YAML format

project.buildWorkflow.addPostBuildJob('build_target', {
  permissions: { contents: JobPermission.READ },
  runsOn: ['ubuntu-latest'],
  //needs: [], // No need to wait for selfmutation
  //if: 'true', // Always run independent of sell mutation
  steps: [
    {
      name: 'Checkout',
      uses: 'actions/checkout@v2',
      with: {
        ref: '${{ github.base_ref }}',
        repository: '${{ github.event.pull_request.head.repo.full_name }}',
      },
    },
    {
      name: 'Setup cfn-lint',
      uses: 'scottbrenner/cfn-lint-action@v2',
    },
    {
      name: 'Install dependencies',
      run: 'yarn install --check-files',
    },
    {
      name: 'Build',
      run: 'yarn build',
    },
    {
      name: 'Save CloudFormation templates',
      uses: 'actions/upload-artifact@v3',
      with: {
        name: 'base-branch-templates',
        path: 'cdk.out',
      },
    },
  ],
});

project.buildWorkflow.addPostBuildJob('cfn-diff', {
  permissions: { contents: JobPermission.READ },
  runsOn: ['ubuntu-latest'],
  needs: ['build', 'build_target'],
  steps: [
    {
      name: 'Download base branch CloudFomration templates',
      uses: 'actions/download-artifact@v3',
      with: {
        name: 'base-branch-templates',
        path: 'cdk.out.base',
      },
    },
    {
      name: "Download build CloudFormation templates",
      run: 'mkdir -p cdk.out && cp dist/* cdk.out/'
    },
    /*
    {
      name: 'Download build CloudFomration templates',
      uses: 'actions/download-artifact@v3',
      with: {
        name: 'build-templates',
        path: 'cdk.out.build',
      },
    },
    */
    {
      name: 'Diff',
      run: 'diff -r -q cdk.out.build cdk.out.base', // Maybe use cdk diff here?
    },
  ],
});


project.synth();
