
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "ridemate/profile-images",
        resource_type: "image",
        transformation: [
          {
            width: 500,
            height: 500,
            crop: "fill",
            gravity: "face"
          }
        ]
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;
