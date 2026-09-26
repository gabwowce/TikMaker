import express from "express";
import { readAll, removeOne, writeOne } from "../db.js";

export function collectionRouter(folder: string) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const items = await readAll(folder);
    res.json(items);
  });

  router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (data?.id !== id) {
      res
        .status(400)
        .json({ error: `Body id "${data?.id}" does not match URL id "${id}"` });
      return;
    }
    await writeOne(folder, id, data);
    res.json(data);
  });

  router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    await removeOne(folder, id);
    res.sendStatus(204);
  });

  return router;
}
