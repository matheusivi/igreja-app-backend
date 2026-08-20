import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  PORT: z.string().default("3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ALLOWED_ORIGINS: z.string().optional(),

  /**
   * Teto do corpo da requisição, no formato da biblioteca `bytes`:
   * um número seguido de `b`, `kb`, `mb` ou `gb`.
   *
   * ═══ POR QUE VALIDAR O FORMATO, E NÃO SÓ ACEITAR TEXTO ═══
   * O `body-parser` tem um comportamento que vira armadilha: valor de limite
   * INVÁLIDO não dá erro — ele DESLIGA a verificação de tamanho em silêncio
   * (GHSA-v422-hmwv-36x6). Ou seja, um `.env` com "100 kb", "100kbs" ou
   * "100" digitado errado não quebra nada no boot; só faz o servidor passar a
   * aceitar corpo de qualquer tamanho.
   *
   * Numa VPS de 4 GB, isso é uma requisição para derrubar o app da igreja.
   *
   * O regex transforma o erro silencioso em erro alto: o servidor não sobe,
   * e a mensagem diz exatamente o que está errado. Esse é o único desfecho
   * aceitável para um limite de segurança mal escrito.
   */
  PAYLOAD_SIZE: z
    .string()
    .regex(
      /^\d+(\.\d+)?(b|kb|mb|gb)$/i,
      'PAYLOAD_SIZE deve ser um número seguido de b, kb, mb ou gb — por exemplo "100kb". Valor inválido faz o Express aceitar corpo de qualquer tamanho, sem avisar.',
    )
    .default("100kb"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY é obrigatória"),

  /**
   * Remetente dos e-mails, no formato `Nome <endereco@dominio>`.
   *
   * ⚠️  O padrão é o modo de TESTE do Resend: ele só entrega para o e-mail
   * dono da conta, e a congregação não receberia nada. Antes de publicar,
   * verifique um domínio no Resend e aponte esta variável para ele.
   *
   * Opcional de propósito — assim o projeto sobe local sem configuração, e o
   * `email.ts` avisa em log toda vez que usa o remetente de teste.
   */
  EMAIL_REMETENTE: z.string().default("IBVI <onboarding@resend.dev>"),

  /**
   * Endereço de um front WEB, se um dia existir.
   *
   * Era obrigatória e montava o link do e-mail de recuperação — apontando
   * para uma página que nunca existiu, porque o front é um aplicativo. Agora
   * o e-mail manda o CÓDIGO, e esta variável ficou sem uso.
   *
   * Mantida como opcional em vez de removida: é o que um painel web usaria,
   * e exigi-la hoje só criaria um campo obrigatório que ninguém sabe
   * preencher.
   */
  FRONTEND_URL: z.string().optional(),

  // Cloudinary — hospedagem das imagens (foto de perfil, capas etc.).
  // Opcionais de propósito: sem elas o servidor sobe normalmente e apenas o
  // upload fica indisponível, com mensagem clara. Assim ninguém precisa
  // configurar Cloudinary para rodar o projeto localmente.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
