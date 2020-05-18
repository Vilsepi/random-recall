const https = require('https');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function httpsPost({body, ...options}) {
    return new Promise((resolve,reject) => {
        const req = https.request({
            method: 'POST',
            ...options,
        }, res => {
            console.log('statusCode:', res.statusCode);
            const chunks = [];
            res.on('data', data => chunks.push(data))
            res.on('end', () => {
                let body = Buffer.concat(chunks);
                switch(res.headers['content-type']) {
                    case 'application/json':
                        body = JSON.parse(body);
                        break;
                }
                resolve(body)
            })
        })
        req.on('error',reject);
        if(body) {
            req.write(body);
        }
        req.end();
    })
}

async function sendMessage(chatId, message) {
    const authToken = process.env.TELEGRAM_BOT_AUTH_TOKEN;
    const res = await httpsPost({
        hostname: 'api.telegram.org',
        path: `/bot${authToken}/sendMessage`,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            chat_id: chatId,
            text: message
        })
    });
    console.log(res);
    return res;
}

async function sendPhoto(chatId, photoUrl) {
    const authToken = process.env.TELEGRAM_BOT_AUTH_TOKEN;
    const res = await httpsPost({
        hostname: 'api.telegram.org',
        path: `/bot${authToken}/sendPhoto`,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl
        })
    });
    console.log(res);
    return res;
}

async function getPhotoUrl() {
    const objects = await s3.listObjectsV2({
        Bucket: process.env.BUCKET_NAME,
        Prefix: "photos-bot-can-send/",
        MaxKeys: 500
    }).promise();

    const validPhotos = objects.Contents.filter(function(obj) {
        return obj.Key.endsWith(".jpg");
    });

    const photo = validPhotos[Math.floor(Math.random() * validPhotos.length)];
    const photoKey = photo.Key;
    console.log(photoKey);

    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: photoKey,
        Expires: 30
    };
    const photoSignedUrl = s3.getSignedUrl('getObject', params);
    console.log('The signed photo url is', photoSignedUrl);
    return photoSignedUrl;
}

exports.handler = async (event) => {
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // await sendMessage(chatId, "Hello my friend!");

    const photoUrl = await getPhotoUrl();
    await sendPhoto(chatId, photoUrl);

    const response = {
        statusCode: 200,
        body: JSON.stringify('Lambda OK'),
    };
    return response;
};
