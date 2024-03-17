import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from "cloudinary";
import fs, { appendFile } from "fs";
import jwt from "jsonwebtoken";
import { constants } from "buffer";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

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
      throw new ApiError(400, " avater field is required");
    }

  //upload on cloudinary

  let avatar = await uploadOnCloudinary(avatarPath);
  let cover = await uploadOnCloudinary(coverPath);

  if (!avatar) {
    throw new ApiError(400, createdUser, " avater field is required");
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

//login user
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (username === undefined && email === undefined) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "User not exist");
  }
  const isPassValid = await user.isPasswordCorrect(password);

  if (!isPassValid) {
    throw new ApiError(404, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logOut = asyncHandler(async (req, res) => {
  console.log(req.user);
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorised Request");
    }
    //Decoded token
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user) {
      throw new ApiError(404, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Expired Token");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    const newRefreshToken = refreshToken;
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message);
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  let user = await User.findById(req.user._id);
  const isPassValid = await user.isPasswordCorrect(oldPassword);

  if (!isPassValid) {
    throw new ApiError(401, "Current password is Incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Passaword Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current User"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select("-password");
  const oldAvatar = user.avatar;
  const avatarPath = req.files.avatar[0].path;
  if (!avatarPath) {
    throw new ApiError(500, "Can't get avatar image");
  }
  const avatar = await uploadOnCloudinary(avatarPath);
  if (!avatar) {
    throw new ApiError(404, "faild to update avatar");
  }
  user.avatar = avatar?.url;
  user.save({ validateBeforeSave: false });
  fs.unlinkSync(avatarPath);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Avatar Updated Successfully"));
});
export {
  registerUser,
  loginUser,
  logOut,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAvatar,
};
