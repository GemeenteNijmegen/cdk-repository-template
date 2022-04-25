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
      run: 'mkdir -p dist && cp cdk.out/* dist/',
    },
  ],
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

/**
 * Add a build job for the target branch when a PR is made
 */
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

/**
 * Add a job to do a diff between the CloudFormation templates of the build and
 * the CloudFormation templates of the target branch build. If there are diffs add
 * a comment to the PR with the differences found.
 * Note: currently cdk diff is not used as this required a list of all stacks to be
 * passed to the cdk diff call.
 */
project.buildWorkflow.addPostBuildJob('cfn-diff', {
  permissions: {
    contents: JobPermission.READ,
    pullRequests: JobPermission.WRITE,
  },
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
      name: 'Download build CloudFormation templates',
      run: 'mkdir -p cdk.out.build && cp dist/* cdk.out.build/',
    },
    {
      name: 'Diff',
      run: 'diff -r -q cdk.out.build cdk.out.base >> diff.txt; exitcode=$?;', // TODO: use cdk diff here.
    },
    {
      name: 'Diff in CloudFormation',
      if: '${{ env.exitcode == 1 }}',
      run: 'gh pr comment $PR --body-file diff.txt -R $GITHUB_REPOSITORY',
      env: {
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
        GITHUB_REPOSITORY: '${{ github.repository }}',
        PR: '${{ github.event.pull_request.number }}',
      },
    },
    {
      name: 'No diff in CloudFormation',
      if: '${{ env.exitcode == 0 }}',
      run: 'gh pr comment $PR --body "No differences in CloudFormation templates" -R $GITHUB_REPOSITORY',
      env: {
        GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
        GITHUB_REPOSITORY: '${{ github.repository }}',
        PR: '${{ github.event.pull_request.number }}',
      },
    },
  ],
});


project.synth();
