import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import schoolRoutes from "./school.routes";
import notificationRoutes from "./notification.routes";
import pushRoutes from "./push.routes";
import superAdminRoutes from "./superAdmin.routes";
import schoolRequestRoutes from "./schoolRequest.routes";
import websiteKnowledgeRoutes from "./websiteKnowledge.routes";

/**
 * Super Admin Platform API. Only the platform-tier routes are mounted here;
 * every school-level module stays in the school project. Both projects share
 * one Supabase database, so the schools, users and requests seen here are the
 * same rows the school project uses.
 */
const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/schools", schoolRoutes);
router.use("/notifications", notificationRoutes);
router.use("/push", pushRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/school-requests", schoolRequestRoutes);
router.use("/website-knowledge", websiteKnowledgeRoutes);

export default router;
