import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;
  console.log(username);
  console.log(email);
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
  const avatarPath = req.files?.avatar[0]?.path;
  const coverPath = req.files?.avatar[0]?.path;

  if (!avatarPath) {
    throw new Error(400, " avater field is required");
  }

  //upload on cloudinary

  const avatar = await uploadOnCloudinary(avatarPath);
  const cover = await uploadOnCloudinary(coverPath);
  if (!avatar) {
    throw new Error(400, createdUser, " avater field is required");
  }

  //create user
  const user = await User.create({
    fullName,
    email,
    username,
    avatar: avatar.url,
    coverImage: cover?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "--password --refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "User registered Successfully"));
});

export { registerUser };
