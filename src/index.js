import "dotenv/config";
import app from "./app.js";
import ConnectDB from "./db/index.js";
import { asyncHandler } from "./utils/asyncHandler.js";
ConnectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log("SERVER STARTED AT PORT " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("FAILED TO CONNECT DATABASE AT INDEX PAGE");
  });
