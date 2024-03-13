import mongoose from "mongoose";
const ConnectDB = async () => {
  try {
    const DB = await mongoose.connect(
      `${process.env.MONGODB_URL}/${process.env.DB_NAME}`
    );
    console.log("DATABASE CONNECTED SUCCESSFULLY" + DB);
  } catch (error) {
    console.log("Connection Failed with database : " + error);
  }
};
export default ConnectDB;
