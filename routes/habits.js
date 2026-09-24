import express from "express"; 
import { getHabits, createHabit, updateHabit, deleteHabit,archiveHabit, reorderHabits } from "../controllers/habitController.js";
import { protect } from "../middleware/auth.js";
import { updateProfile } from "../controllers/authController.js";

const router = express.Router(); 

router.use(protect); 

router.get("/", getHabits); 
router.post("/", createHabit); 
router.put("/reorder", reorderHabits); 
router.get("/:id", updateProfile); 
router.get("/:id", deleteHabit); 
router.get("/:id/archive", archiveHabit); 

export default router; 