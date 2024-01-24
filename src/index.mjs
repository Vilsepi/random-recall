import * as https from 'https';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client();

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
    console.log(JSON.stringify(res));
    return res;
}

async function getChatAdministrators(chatId) {
    const res = await apiCall('getChatAdministrators', {
        chat_id: chatId,
    });
    return res.result;
}

async function getChatMembersCount(chatId) {
    const res = await apiCall('getChatMembersCount', {
        chat_id: chatId,
    });
    return res.result;
}

async function isCorrectAudience(chatId) {
    const admins = await getChatAdministrators(chatId);
    const audienceCount = await getChatMembersCount(chatId);
    if (
        audienceCount == process.env.TELEGRAM_EXPECTED_CHAT_MEMBER_COUNT &&
        admins.length == 1 &&
        admins[0].user.username == process.env.TELEGRAM_EXPECTED_CHAT_ADMIN_USERNAME &&
        admins[0].user.id == process.env.TELEGRAM_EXPECTED_CHAT_ADMIN_ID &&
        admins[0].status == "creator"
    ) {
        return true;
    }
    console.warn("Unexpected audience (" + audienceCount + ")! " + JSON.stringify(admins));
    return false;
}

async function getPhotoUrl() {
    const objects = await s3.send(new ListObjectsV2Command({
        Bucket: process.env.BUCKET_NAME,
        Prefix: "photos-bot-can-send/",
        MaxKeys: 1000
    }));

    const validPhotos = objects.Contents.filter(obj => {
        return obj.Key.endsWith(".jpg");
    });
    console.log("Found " + validPhotos.length + " valid photos to choose from");

    const randomPhoto = validPhotos[Math.floor(Math.random() * validPhotos.length)].Key;
    const command = new GetObjectCommand({Bucket: process.env.BUCKET_NAME, Key: randomPhoto});
    const photoSignedUrl = getSignedUrl(s3, command, {expiresIn: 20});
    return photoSignedUrl;
}

export const handler = async (event) => {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (await isCorrectAudience(chatId)) {
        const photoUrl = await getPhotoUrl();
        await sendPhoto(chatId, photoUrl);
        return {
            statusCode: 200,
            body: "Photo sent",
        };
    }
    else {
        return {
            statusCode: 500,
            body: "Unintended audience in chat!",
        };
    }
};
