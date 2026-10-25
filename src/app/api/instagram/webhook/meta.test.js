import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { respuestaVerificacion, firmaValida, linksDe, guardarLinks } from "./meta.js";

const firma = (cuerpo, secreto) => "sha256=" + createHmac("sha256", secreto).update(cuerpo).digest("hex");

test("verificación: devuelve el challenge solo con el token correcto", () => {
  const q = (t) => new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": t, "hub.challenge": "1158201444" });
  assert.equal(respuestaVerificacion(q("abc"), "abc"), "1158201444");
  assert.equal(respuestaVerificacion(q("otro"), "abc"), null);
  assert.equal(respuestaVerificacion(q("abc"), ""), null);   // sin token configurado no se verifica nada
  assert.equal(respuestaVerificacion(new URLSearchParams({ "hub.mode": "x", "hub.verify_token": "abc", "hub.challenge": "1" }), "abc"), null);
});

test("firma: acepta cualquiera de los secretos configurados y rechaza lo demás", () => {
  const cuerpo = '{"object":"instagram"}';
  assert.equal(firmaValida(cuerpo, firma(cuerpo, "s1"), ["s1"]), true);
  assert.equal(firmaValida(cuerpo, firma(cuerpo, "s2"), ["s1", "s2"]), true);
  assert.equal(firmaValida(cuerpo, firma(cuerpo, "s3"), ["s1", "s2"]), false);
  assert.equal(firmaValida(cuerpo + " ", firma(cuerpo, "s1"), ["s1"]), false);
  assert.equal(firmaValida(cuerpo, null, ["s1"]), false);
  assert.equal(firmaValida(cuerpo, "sha256=zz", ["s1"]), false);
  assert.equal(firmaValida(cuerpo, firma(cuerpo, "s1"), []), false);
  assert.equal(firmaValida(cuerpo, firma(cuerpo, "s1"), [undefined, ""]), false);
});

test("links: reels compartidos (ig_reel) y links de TikTok/Instagram escritos en el texto", () => {
  const evento = {
    object: "instagram",
    entry: [{
      id: "17841400000000000", time: 1,
      messaging: [
        { sender: { id: "1" }, recipient: { id: "2" }, message: { mid: "a", attachments: [
          { type: "ig_reel", payload: { reel_video_id: "9", title: "x", url: "https://www.instagram.com/reel/DUf9yHRDRsx/?igsh=abc" } },
          { type: "image", payload: { url: "https://cdn.example/foto.jpg" } },
        ] } },
        { sender: { id: "3" }, recipient: { id: "2" }, message: { mid: "b",
          text: "mira este https://vt.tiktok.com/ZSHqXGWx7/ y este https://www.tiktok.com/@a/video/123?lang=es jaja" } },
        { sender: { id: "4" }, recipient: { id: "2" }, message: { mid: "c", text: "hola sin link", is_echo: false } },
        { sender: { id: "2" }, recipient: { id: "4" }, message: { mid: "d", is_echo: true, text: "https://vm.tiktok.com/ZZZ/" } },
      ],
    }],
  };
  assert.deepEqual(linksDe(evento), [
    "https://www.instagram.com/reel/DUf9yHRDRsx/",
    "https://vt.tiktok.com/ZSHqXGWx7/",
    "https://www.tiktok.com/@a/video/123",
  ]);
});

test("links: un ig_reel sin url se ignora y eventos raros no rompen", () => {
  assert.deepEqual(linksDe({ entry: [{ messaging: [{ message: { attachments: [{ type: "ig_reel", payload: {} }] } }] }] }), []);
  assert.deepEqual(linksDe({}), []);
  assert.deepEqual(linksDe(null), []);
});

test("guardar: solo el link y la hora; los repetidos no vuelven a la cola", async () => {
  const vistos = new Set(), cola = [];
  const r = { sAdd: async (_k, v) => (vistos.has(v) ? 0 : (vistos.add(v), 1)), lPush: async (_k, v) => cola.push(v) };
  const n = await guardarLinks(r, ["https://vt.tiktok.com/A/", "https://vt.tiktok.com/A/", "https://www.instagram.com/reel/X/"], "2026-10-25T22:00:00.000Z");
  assert.equal(n, 2);
  assert.deepEqual(cola.map((v) => JSON.parse(v)), [
    { link: "https://vt.tiktok.com/A/", recibido: "2026-10-25T22:00:00.000Z" },
    { link: "https://www.instagram.com/reel/X/", recibido: "2026-10-25T22:00:00.000Z" },
  ]);
  assert.equal(await guardarLinks(r, ["https://vt.tiktok.com/A/"], "x"), 0);
});
