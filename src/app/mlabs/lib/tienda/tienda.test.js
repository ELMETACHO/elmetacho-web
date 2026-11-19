import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  modoTienda, monedaPara, precioDe, sePuedeComprar, formatoMoneda, nuevoPedidoId, esPedidoId, firmaIntegridad,
  firmaWebhookValida, tokenEntrega, leerTokenEntrega, nuevoPedido, confirmarPago, pagoDeEvento, correoValido,
} from "./tienda.js";

const env = { MLABS_TIENDA: "pruebas", BOLD_IDENTITY_KEY: "i", BOLD_SECRET_KEY: "s", MLABS_ENTREGA_SECRETO: "e" };
const prod = { slug: "kit", nombre: "Kit", estado: "disponible", precios: { COP: 69000, USD: 19 }, archivo: "mlabs/productos/kit/kit.zip" };

test("modo de la tienda: apagada salvo pruebas/real con todas las llaves", () => {
  assert.equal(modoTienda(env), "pruebas");
  assert.equal(modoTienda({ ...env, MLABS_TIENDA: "real" }), "real");
  assert.equal(modoTienda({ ...env, MLABS_TIENDA: undefined }), null);
  assert.equal(modoTienda({ ...env, MLABS_TIENDA: "si" }), null);
  assert.equal(modoTienda({ ...env, BOLD_SECRET_KEY: "" }), null);
  assert.equal(modoTienda({ ...env, MLABS_ENTREGA_SECRETO: "" }), null);
});

test("moneda: la cookie manda; si no, Colombia paga en COP y el resto en USD", () => {
  assert.equal(monedaPara({ cookie: "USD", pais: "CO" }), "USD");
  assert.equal(monedaPara({ cookie: "xx", pais: "co" }), "COP");
  assert.equal(monedaPara({ pais: "MX" }), "USD");
  assert.equal(monedaPara({}), "USD");
});

test("solo se compra lo disponible, con precio en las dos monedas y archivo", () => {
  assert.equal(sePuedeComprar(prod, "pruebas"), true);
  assert.equal(sePuedeComprar(prod, null), false);
  assert.equal(sePuedeComprar({ ...prod, estado: "preventa" }, "real"), false);
  assert.equal(sePuedeComprar({ ...prod, precios: { COP: 69000, USD: null } }, "real"), false);
  assert.equal(sePuedeComprar({ ...prod, archivo: null }, "real"), false);
  assert.equal(sePuedeComprar({ ...prod, soloPruebas: true }, "real"), false);
  assert.equal(precioDe(prod, "USD"), 19);
  assert.equal(precioDe({ precios: { COP: 1.5 } }, "COP"), null);
});

test("formato de precio", () => {
  assert.equal(formatoMoneda(69000, "COP"), "$69.000 COP");
  assert.equal(formatoMoneda(19, "USD"), "US$19");
  assert.equal(formatoMoneda(0, "USD"), null);
});

test("id de pedido y firma de integridad", () => {
  const id = nuevoPedidoId(1763300000000, "a1b2c3");
  assert.equal(id, "MLABS-T-1763300000000-a1b2c3");
  assert.ok(esPedidoId(id));
  assert.ok(!esPedidoId("MLABS-1763300000000-a1b2c3"));   // los de /pagar no son de la tienda
  assert.equal(firmaIntegridad("P", 1000, "COP", "k").length, 64);
});

test("webhook: firma = hex(HMAC-SHA256(llave, base64(cuerpo))); acepta la llave vacía de pruebas si se le pasa", () => {
  const cuerpo = JSON.stringify({ type: "SALE_APPROVED", á: "ñ" });
  const firma = (k) => createHmac("sha256", k).update(Buffer.from(cuerpo, "utf8").toString("base64")).digest("hex");
  assert.ok(firmaWebhookValida(cuerpo, firma("secreta"), ["secreta"]));
  assert.ok(firmaWebhookValida(cuerpo, firma(""), ["secreta", ""]));
  assert.ok(!firmaWebhookValida(cuerpo, firma(""), ["secreta"]));
  assert.ok(!firmaWebhookValida(cuerpo + " ", firma("secreta"), ["secreta"]));
  assert.ok(!firmaWebhookValida(cuerpo, "", ["secreta"]));
});

test("token de entrega: válido, vencido o adulterado", () => {
  const id = "MLABS-T-1763300000000-a1b2c3";
  const t = tokenEntrega(id, 2000, "e");
  assert.deepEqual(leerTokenEntrega(t, "e", 1000), { pedido: id, vencido: false });
  assert.deepEqual(leerTokenEntrega(t, "e", 3000), { pedido: id, vencido: true });
  assert.equal(leerTokenEntrega(t, "otra", 1000), null);
  assert.equal(leerTokenEntrega(t.replace("2000", "9999"), "e", 1000), null);
  assert.equal(leerTokenEntrega("basura", "e", 1000), null);
});

test("correo válido", () => {
  assert.ok(correoValido("a@b.co"));
  assert.ok(!correoValido("a@b"));
  assert.ok(!correoValido(""));
});

function memoria(pedidos = []) {
  const m = { pedidos: new Map(pedidos.map((p) => [p.id, p])), compradores: [], avisos: [] };
  m.deps = {
    almacen: {
      leerPedido: async (id) => m.pedidos.get(id) ?? null,
      guardarPedido: async (p) => void m.pedidos.set(p.id, p),
      registrarComprador: async (p) => void m.compradores.push(p.id),
    },
    ahora: 1763300100000,
    avisar: async (t) => void m.avisos.push(t),
  };
  return m;
}
const ID = "MLABS-T-1763300000000-a1b2c3";
const pedido = () => nuevoPedido({ id: ID, producto: prod, moneda: "COP", nombre: "Ana", correo: " Ana@Correo.CO ", ahora: 1763300000000, modo: "pruebas" });

test("pedido nuevo con el precio del servidor y el correo normalizado", () => {
  const p = pedido();
  assert.deepEqual([p.monto, p.moneda, p.correo, p.estado], [69000, "COP", "ana@correo.co", "pendiente"]);
});

test("pago aprobado con monto y moneda correctos: pagado, comprador registrado y aviso; repetido no duplica", async () => {
  const m = memoria([pedido()]);
  const r = await confirmarPago({ referencia: ID, total: 69000, moneda: "COP", estado: "APPROVED", idBold: "T1" }, m.deps);
  assert.equal(r.estado, "pagado");
  assert.equal(m.pedidos.get(ID).estado, "pagado");
  assert.deepEqual(m.compradores, [ID]);
  assert.match(m.avisos[0], /PRUEBA/);
  const r2 = await confirmarPago({ referencia: ID, total: 69000, moneda: "COP", estado: "APPROVED" }, m.deps);
  assert.equal(r2.repetido, true);
  assert.equal(m.compradores.length, 1);
});

test("pago con otro monto u otra moneda: no se entrega y queda para revisar", async () => {
  for (const [total, moneda] of [[1000, "COP"], [69000, "USD"]]) {
    const m = memoria([pedido()]);
    const r = await confirmarPago({ referencia: ID, total, moneda, estado: "APPROVED" }, m.deps);
    assert.equal(r.estado, "revisar");
    assert.equal(m.compradores.length, 0);
    assert.match(m.avisos[0], /no coincide/);
  }
});

test("rechazado, pendiente, ajeno y desconocido", async () => {
  const m = memoria([pedido()]);
  assert.equal((await confirmarPago({ referencia: ID, estado: "PENDING" }, m.deps)).estado, "pendiente");
  assert.equal((await confirmarPago({ referencia: ID, estado: "REJECTED" }, m.deps)).estado, "rechazado");
  assert.equal(m.pedidos.get(ID).estado, "rechazado");
  assert.equal((await confirmarPago({ referencia: "MLABS-1-abc", estado: "APPROVED" }, m.deps)).estado, "ajeno");
  assert.equal((await confirmarPago({ referencia: "MLABS-T-1763300000000-ffffff", estado: "APPROVED" }, m.deps)).estado, "desconocido");
});

test("evento del webhook → pago", () => {
  const ev = { type: "SALE_APPROVED", subject: "T5", data: { payment_id: "T5", metadata: { reference: ID }, amount: { total: 69000, currency: "COP" }, payer_email: "a@b.co" } };
  assert.deepEqual(pagoDeEvento(ev), { referencia: ID, total: 69000, moneda: "COP", estado: "APPROVED", idBold: "T5", correo: "a@b.co" });
  assert.equal(pagoDeEvento({ type: "VOID_APPROVED", data: {} }), null);
});

test("paquete de créditos (Ahorra): se vende sin archivo y al pagarse suma los archivos al correo", async () => {
  const paquete = { slug: "ahorra-50", nombre: "Ahorra · 50", estado: "disponible", precios: { COP: 14900, USD: 4 }, creditos: 50, archivo: null };
  assert.equal(sePuedeComprar(paquete, "real"), true);
  assert.equal(sePuedeComprar(paquete, null), false);
  const p = nuevoPedido({ id: ID, producto: paquete, moneda: "COP", nombre: "Ana", correo: "Ana@x.co", ahora: 1763300000000, modo: "real" });
  assert.deepEqual([p.monto, p.creditos], [14900, 50]);
  const m = memoria([p]);
  const sumados = [];
  m.deps.almacen.sumarCreditos = async (correo, n) => void sumados.push([correo, n]);
  await confirmarPago({ referencia: ID, total: 14900, moneda: "COP", estado: "APPROVED" }, m.deps);
  await confirmarPago({ referencia: ID, total: 14900, moneda: "COP", estado: "APPROVED" }, m.deps);   // repetido: no suma otra vez
  assert.deepEqual(sumados, [["ana@x.co", 50]]);
});
