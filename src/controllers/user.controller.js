import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;
  //validation

  if (
    [fullName, password, email, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  //check user exist or not

  const userExist = await User.findOne({ $or: [{ username }, { email }] });
  if (userExist) {
    throw new ApiError(509, "user with this email or username alrady exist");
  }

  //accessing images or files
  let avatarPath = req.files?.avatar[0]?.path;
  let coverPath = null;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverPath = req.files?.coverImage[0]?.path;
  }
  if (req.files && Array.isArray())
    if (!avatarPath) {
      throw new Error(400, " avater field is required");
    }

  //upload on cloudinary

  let avatar = await uploadOnCloudinary(avatarPath);
  let cover = await uploadOnCloudinary(coverPath);

  if (!avatar) {
    throw new Error(400, createdUser, " avater field is required");
  }

  const deleteItem = async (img_id) => {
    cloudinary.uploader.destroy(img_id, function (error, result) {
      console.log(result, error);
    });

    console.log("item deleted from cloudinary");
  };

  //create user
  const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.url,
    coverImage: cover?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "--password --refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating a user");
  }
  console.log(cover);
  console.log(avatar);
  deleteItem(cover.public_id);
  deleteItem(avatar.public_id);

  if (createdUser) {
    fs.unlinkSync(avatarPath);
    if (coverPath) {
      fs.unlinkSync(coverPath);
    }
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "User registered Successfully"));
});

export { registerUser };
