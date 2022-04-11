# Template repository for Gemeente Nijmegen cdk projects

## Getting started
This repository can be used as a Github template to start new cdk projects for Gemeente Nijmegen.

## Setup workflow configuration
It is important to configure a personal access token as a Github workflow secret.

* Create a new personal access token under your account settings
    * Settings > Developer settings > Perosnal access tokens
    * Allow all repo rights and allow workflow rights
* Copy the personal access code
* Create a workflow secret in the repository called ```PROJEN_GITHUB_TOKEN``` and paste your personal access token in there.

**Note:** this can be dangerous as everybody with write access to the repository can now acces your personal access token. (A PR from a fork will not have acces to the workflow secrets.)