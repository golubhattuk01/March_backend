import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filepath) => {
  try {
    if (!filepath) return null;
    const response = await cloudinary.uploader.upload(filepath, {
      resource_type: auto,
    });
    console.log("file uploaded on cloudinary" + response.url);
    return response;
  } catch (err) {
    fs.unlinkSynce(filepath); //remove unuploaded file form local files
    return null;
  }
};
