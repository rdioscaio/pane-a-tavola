export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();

    // Validação básica
    if (!body.items || body.items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Carrinho vazio" }), { status: 400 });
    }

    const db = env.PANE_DB; // BINDING PADRONIZADO
    const now = new Date().toISOString();

    // Dados do corpo da requisição (vindo do modal)
    const customerName = body.customer_name || 'Cliente Site';
    const channel = body.channel || 'site';
    const paymentMethod = body.payment_method || 'outro';
    const notes = body.notes || '';
    const totalCents = body.total_value_cents || 0; // Recebe o total calculado no front

    // 1. Inserir na tabela SALES (Financeiro/Histórico)
    // Estamos assumindo que sua tabela SALES tem colunas para cliente. 
    // Se não tiver, ele vai gravar só o essencial ou você precisará rodar uma migration.
    const result = await db.prepare(`
      INSERT INTO sales (
        customer_name, 
        channel, 
        payment_method, 
        total_value_cents, 
        notes, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      customerName,
      channel,
      paymentMethod,
      totalCents,
      notes,
      now
    ).run();

    if (!result.success) {
      throw new Error("Falha ao gravar no banco D1");
    }

    return new Response(JSON.stringify({ ok: true, id: result.meta.last_row_id }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}