const https = require('https');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function apiCall(methodName, requestBody) {
    const authToken = process.env.TELEGRAM_BOT_AUTH_TOKEN;
    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'POST',
            hostname: 'api.telegram.org',
            path: `/bot${authToken}/${methodName}`,
            headers: {'Content-Type': 'application/json'}
        }, res => {
            console.log('statusCode:', res.statusCode);
            const chunks = [];
            res.on('data', data => chunks.push(data))
            res.on('end', () => {
                let responseBody = Buffer.concat(chunks);
                switch(res.headers['content-type']) {
                    case 'application/json':
                        responseBody = JSON.parse(responseBody);
                        break;
                }
                resolve(responseBody)
            })
        })
        req.on('error', reject);
        if(requestBody) {
            req.write(JSON.stringify(requestBody));
        }
        req.end();
    })
}

async function sendPhoto(chatId, photoUrl) {
    const res = await apiCall('sendPhoto', {
        chat_id: chatId,
        photo: photoUrl
    });
    console.log(res);
    return res;
}

async function getPhotoUrl() {
    const objects = await s3.listObjectsV2({
        Bucket: process.env.BUCKET_NAME,
        Prefix: "photos-bot-can-send/",
        MaxKeys: 1000
    }).promise();

    const validPhotos = objects.Contents.filter(obj => {
        return obj.Key.endsWith(".jpg");
    });

    const randomPhoto = validPhotos[Math.floor(Math.random() * validPhotos.length)].Key;
    const photoSignedUrl = s3.getSignedUrl('getObject', {
        Bucket: process.env.BUCKET_NAME,
        Key: randomPhoto,
        Expires: 20
    });
    return photoSignedUrl;
}

exports.handler = async (event) => {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const photoUrl = await getPhotoUrl();
    await sendPhoto(chatId, photoUrl);

    const response = {
        statusCode: 200,
        body: JSON.stringify('Lambda OK'),
    };
    return response;
};
