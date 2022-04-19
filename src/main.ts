import { App, Stack, StackProps, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Construct } from 'constructs';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    console.log('Test logging in cdk synth');
    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'cdk-repository-template-dev', { env: devEnv });
// new MyStack(app, 'cdk-repository-template-prod', { env: prodEnv });

/**
 * Enable cfn-nag during cdk synth
 */
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

app.synth();