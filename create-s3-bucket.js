const AWS = require('aws-sdk');

// Configure AWS with your credentials
AWS.config.update({
  accessKeyId: 'AKIAWRU6VR7OUXBKDQNL',
  secretAccessKey: '6aV/MIddfBjIJKorKeh+90TMUuF6IzEM9Pfzd+sA',
  region: 'us-east-1'
});

const s3 = new AWS.S3();

async function createS3Bucket() {
  const bucketName = 'wuc-admissions-documents';
  
  try {
    // Check if bucket already exists
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
      console.log(`✅ Bucket ${bucketName} already exists`);
      return;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }

    // Create the bucket
    await s3.createBucket({
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: 'us-east-1'
      }
    }).promise();

    // Set bucket policy for secure access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowWUCAppAccess',
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::*:user/wuc-*`
          },
          Action: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject'
          ],
          Resource: `arn:aws:s3:::${bucketName}/*`
        }
      ]
    };

    await s3.putBucketPolicy({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    }).promise();

    // Enable versioning
    await s3.putBucketVersioning({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    }).promise();

    // Set CORS configuration
    await s3.putBucketCors({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    }).promise();

    console.log(`✅ S3 bucket ${bucketName} created successfully in us-east-1`);
    console.log(`✅ Bucket policy configured`);
    console.log(`✅ Versioning enabled`);
    console.log(`✅ CORS configured`);
    
  } catch (error) {
    console.error('❌ Error creating S3 bucket:', error.message);
    process.exit(1);
  }
}

createS3Bucket();