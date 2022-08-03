# random-recall

A Telegram bot that sends a randomly picked photo from an S3 bucket to a chat.

## Deployment

    sls deploy

## Known limitations

Current implementation supports up to 1000 objects in the bucket. Need to implement pagination if limit is reached.
