import app from "./src/app.js";
import { connectToDb } from "./src/database/database.js";

connectToDb();
app.listen(3000, () => {
  console.log("server is runing on port 3000");
});
