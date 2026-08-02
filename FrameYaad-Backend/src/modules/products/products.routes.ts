import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorize } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import * as controller from "./products.controller";
import { createProductSchema, updateProductSchema } from "./products.schemas";

export const productsRouter = Router();
const catalogManagers = authorize(UserRole.ADMIN, UserRole.EMPLOYEE);

productsRouter.use(authenticate);
productsRouter.get("/", controller.listProducts);
productsRouter.get("/:id", controller.getProduct);
productsRouter.post("/", catalogManagers, validateBody(createProductSchema), controller.createProduct);
productsRouter.patch("/:id", catalogManagers, validateBody(updateProductSchema), controller.updateProduct);
productsRouter.delete("/:id", catalogManagers, controller.deleteProduct);
