# random-recall

A Telegram bot that sends a randomly picked photo from an S3 bucket to a chat.

## Prerequisites

Install open source Serverless Framework, as Serverless 4 now requires a license.

    npm remove -g serverless
    npm install -g osls

TODO: Get rid of Serverless and replace with CDK or Pulumi.

## Deployment

    sls deploy

## Known limitations

Current implementation supports up to 1000 objects in the bucket. Need to implement pagination if limit is reached.
