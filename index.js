const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// 🌌 SYLENMC BOT
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "s.";

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const RULES_DC_ID = "PON_AQUI_ID_REGLAS_DC";
const RULES_MC_ID = "PON_AQUI_ID_REGLAS_MC";
const TICKET_CHANNEL_ID = "PON_AQUI_ID_CREAR_TICKET";

const STAFF_ROLE_1 = "1422028548893311089";
const STAFF_ROLE_2 = "1422028548893311088";

// ============================================================
// 🎨 COLORES / DECORACIÓN
// ============================================================

const COLORS = {
  main: 0x9b59b6,
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2,
  economy: 0xf1c40f,
  ticket: 0x3498db,
  admin: 0xe67e22
};

const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ============================================================
// 🎫 EMOJIS
// ============================================================

const EMOJIS = {
  diamante: "<:BLOQUE_DIAMANTE:1422407517056536656>",
  hardcore: "<:HARCORED:1422591052770050058>",
  duda: "<:interrogacion:1422591514327908386>",
  engranaje: "<:ENGRANAJE:1422592111819231382>",
  minecraft: "<a:MINECRAFT:1422411326403117127>",
  hacha: "<a:HACHA:1422410643985661995>",
  tridente: "<a:TRIDENTE:1422412335720435765>",
  loro: "<a:LORO:1419427343075901600>",
  reloj: "<a:Nautic_Reloj:931873104215552070>",
  minecraft2: "<a:MINECRAFT:1419427193649627156>"
};

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

const DATA_FILE = path.join(__dirname, "sylenmc-data.json");

let db = {
  guilds: {},
  users: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    if (!db.guilds) db.guilds = {};
    if (!db.users) db.users = {};
  } catch (error) {
    console.error("❌ Error leyendo la base de datos:", error);

    db = {
      guilds: {},
      users: {}
    };
  }
}

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error("❌ Error guardando DB:", error);
  }
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      welcomeChannel: null,
      inviteChannel: null
    };

    saveDB();
  }

  return db.guilds[guildId];
}

function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      wallet: 0,
      bank: 0,
      invites: 0
    };

    saveDB();
  }

  return db.users[userId];
}

// ============================================================
// 🤖 CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites
  ],

  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
    Partials.Message
  ]
});

// ============================================================
// 🌐 RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain"
    });

    res.end("SylenMC Bot está funcionando correctamente.");
  })
  .listen(PORT, () => {
    console.log(`🌐 Servidor HTTP iniciado en puerto ${PORT}`);
  });

// ============================================================
// ⏱️ COOLDOWNS
// ============================================================

const cooldowns = new Map();

function checkCooldown(userId, command, seconds) {
  const key = `${userId}-${command}`;
  const now = Date.now();

  const expiration = cooldowns.get(key);

  if (expiration && now < expiration) {
    return Math.ceil((expiration - now) / 1000);
  }

  cooldowns.set(
    key,
    now + seconds * 1000
  );

  return 0;
}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

function formatMoney(number) {
  return Number(number).toLocaleString("es-ES");
}

function parseAmount(input, user) {
  if (!input) return null;

  if (input.toLowerCase() === "all") {
    return user.wallet;
  }

  const amount = parseInt(input);

  if (isNaN(amount)) return null;

  return amount;
}

function economyEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.economy)
    .setTitle(`💰 ${title}`)
    .setDescription(
      `${LINE}\n${description}\n${LINE}`
    )
    .setFooter({
      text: "SylenMC Economy"
    })
    .setTimestamp();
}

// ============================================================
// 📨 INVITACIONES
// ============================================================

const inviteCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();

    const data = new Map();

    invites.forEach(invite => {
      data.set(invite.code, {
        uses: invite.uses || 0,
        inviter: invite.inviter
          ? invite.inviter.id
          : null
      });
    });

    inviteCache.set(guild.id, data);
  } catch (error) {
    console.error(
      `⚠️ No se pudieron cargar invitaciones de ${guild.name}:`,
      error.message
    );
  }
}

// ============================================================
// 🟢 READY
// ============================================================

client.once("ready", async () => {
  console.log(
    `🤖 ${client.user.tag} está conectado correctamente.`
  );

  client.user.setActivity(
    "SylenMC | s.help",
    {
      type: 3
    }
  );

  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
});

// ============================================================
// ➕ INVITE CREATE
// ============================================================

client.on("inviteCreate", async invite => {
  await cacheGuildInvites(invite.guild);
});

// ============================================================
// 👋 BIENVENIDAS + INVITACIONES
// ============================================================

client.on("guildMemberAdd", async member => {
  const config = getGuild(member.guild.id);

  // ----------------------------------------------------------
  // 👋 BIENVENIDA
  // ----------------------------------------------------------

  if (config.welcomeChannel) {
    const channel =
      member.guild.channels.cache.get(
        config.welcomeChannel
      );

    if (channel) {
      const rulesDC =
        RULES_DC_ID.startsWith("PON_")
          ? "`#『📔』reglas┆dc`"
          : `<#${RULES_DC_ID}>`;

      const rulesMC =
        RULES_MC_ID.startsWith("PON_")
          ? "`#『📖』reglas┆mc`"
          : `<#${RULES_MC_ID}>`;

      const ticketChannel =
        TICKET_CHANNEL_ID.startsWith("PON_")
          ? "`#『📬』crear┆ticket`"
          : `<#${TICKET_CHANNEL_ID}>`;

      const embed = new EmbedBuilder()
        .setColor(COLORS.main)
        .setTitle("👋 ¡Bienvenido a SylenMC!")
        .setDescription(
`¡Hola ${member}! 🎉

Eres nuestro usuario número **${member.guild.memberCount}**. 👥

Aquí puedes **divertirte y disfrutar** con toda la comunidad.

📖 Te recomendamos leer las reglas:
${rulesDC}
${rulesMC}

🎫 Si tienes alguna duda o quieres reportar algo, crea un ticket en ${ticketChannel}.

${LINE}

🎮 **IP DEL SERVIDOR**

IP: \`sylenmc.diavlohosting.com\`
Puerto: \`19016\`

☕ Java y Bedrock

${LINE}

¡Gracias por unirte a SylenMC! 🎉`
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            dynamic: true
          })
        )
        .setTimestamp();

      channel.send({
        embeds: [embed]
      }).catch(() => {});
    }
  }

  // ----------------------------------------------------------
  // 📨 INVITACIONES
  // ----------------------------------------------------------

  try {
    const oldInvites =
      inviteCache.get(member.guild.id);

    const newInvites =
      await member.guild.invites.fetch();

    let usedInvite = null;

    newInvites.forEach(invite => {
      const old =
        oldInvites?.get(invite.code);

      if (
        invite.uses &&
        (!old || invite.uses > old.uses)
      ) {
        usedInvite = invite;
      }
    });

    await cacheGuildInvites(member.guild);

    if (
      usedInvite &&
      usedInvite.inviter
    ) {
      const inviter =
        getUser(usedInvite.inviter.id);

      inviter.invites++;

      saveDB();

      if (config.inviteChannel) {
        const channel =
          member.guild.channels.cache.get(
            config.inviteChannel
          );

        if (channel) {
          channel.send(
`🎉 **Nueva invitación**

👤 ${member} se unió a **SylenMC**.

📨 Invitado por: <@${usedInvite.inviter.id}>
🏆 Invitaciones: **${inviter.invites}**

${LINE}`
          ).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ Error procesando invitación:",
      error
    );
  }
});

// ============================================================
// 🛡️ ADMIN
// ============================================================

function isAdmin(member) {
  return member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );
}

// ============================================================
// 🎲 RANDOM
// ============================================================

function random(min, max) {
  return Math.floor(
    Math.random() *
      (max - min + 1)
  ) + min;
}

// ============================================================
// 👤 USER INFO
// ============================================================

function userInfoEmbed(user) {
  const economy = getUser(user.id);

  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle("👤 Información del usuario")
    .setThumbnail(
      user.displayAvatarURL({
        dynamic: true
      })
    )
    .addFields(
      {
        name: "👤 Usuario",
        value: `${user}`,
        inline: true
      },
      {
        name: "🆔 ID",
        value: `\`${user.id}\``,
        inline: true
      },
      {
        name: "💰 Wallet",
        value: `$${formatMoney(economy.wallet)}`,
        inline: true
      },
      {
        name: "🏦 Banco",
        value: `$${formatMoney(economy.bank)}`,
        inline: true
      },
      {
        name: "📨 Invitaciones",
        value: `${economy.invites}`,
        inline: true
      },
      {
        name: "📅 Cuenta creada",
        value:
          `<t:${Math.floor(
            user.createdTimestamp / 1000
          )}:F>`
      }
    )
    .setTimestamp();
}

// ============================================================
// 📚 HELP PÚBLICO
// ============================================================

function helpMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_menu")
        .setPlaceholder(
          "Selecciona una categoría"
        )
        .addOptions(

          new StringSelectMenuOptionBuilder()
            .setLabel("Economía")
            .setDescription(
              "Dinero y comandos económicos"
            )
            .setValue("economy")
            .setEmoji("💰"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Información")
            .setDescription(
              "Información del servidor y usuarios"
            )
            .setValue("info")
            .setEmoji("ℹ️"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Diversión")
            .setDescription(
              "Comandos para divertirse"
            )
            .setValue("fun")
            .setEmoji("🎮"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Utilidades")
            .setDescription(
              "Herramientas útiles"
            )
            .setValue("utility")
            .setEmoji("🛠️")
        )
    );
}

function helpEmbed(category) {

  if (category === "economy") {
    return new EmbedBuilder()
      .setColor(COLORS.economy)
      .setTitle("💰 Economía — SylenMC")
      .setDescription(
`${LINE}

**s.work**
💼 Gana entre **$50 y $100**
⏱️ Cooldown: **30 segundos**

**s.slut**
🎲 20% de probabilidad de ganar
⏱️ Cooldown: **1 minuto**

**s.crime**
💰 15% de probabilidad de ganar
⏱️ Cooldown: **2 minutos**

**s.daily**
🎁 Obtén **$500**
⏱️ Cooldown: **24 horas**

**s.dep <cantidad/all>**
🏦 Deposita dinero.

**s.bj <cantidad/all>**
🃏 Blackjack.

**s.rob @usuario**
🏴 Intenta robar dinero.

**s.coinflip <cantidad>**
🪙 Cara o cruz.

**s.dice <cantidad>**
🎲 Dados.

**s.balance**
💰 Consulta tu dinero.

${LINE}`
      )
      .setFooter({
        text: "SylenMC Economy"
      });
  }

  if (category === "info") {
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle("ℹ️ Información — SylenMC")
      .setDescription(
`${LINE}

**s.infobot**
🤖 Información del bot.

**s.infoserver**
🏠 Información del servidor.

**s.infoicon**
🖼️ Icono del servidor.

**s.infouser**
👤 Información de un usuario.

**s.balance**
💰 Economía.

**s.invites**
📨 Invitaciones.

${LINE}`
      );
  }

  if (category === "fun") {
    return new EmbedBuilder()
      .setColor(COLORS.main)
      .setTitle("🎮 Diversión — SylenMC")
      .setDescription(
`${LINE}

🎲 **s.dice <cantidad>**
Juega a los dados.

🪙 **s.coinflip <cantidad>**
Juega cara o cruz.

🃏 **s.bj <cantidad>**
Juega Blackjack.

${LINE}`
      );
  }

  if (category === "utility") {
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle("🛠️ Utilidades — SylenMC")
      .setDescription(
`${LINE}

👤 **s.infouser**
Información de usuario.

🏠 **s.infoserver**
Información del servidor.

🖼️ **s.infoicon**
Icono del servidor.

🤖 **s.infobot**
Información del bot.

${LINE}`
      );
  }

  return new EmbedBuilder()
    .setColor(COLORS.main)
    .setTitle("🌌 SylenMC Bot")
    .setDescription(
`${LINE}

¡Bienvenido al centro de comandos de **SylenMC**! 🌌

Selecciona una categoría en el menú de abajo.

**Prefix:** \`s.\`

👤 **Creador de SylenMC:** zRyker
⚙️ **Creador del Bot:** LamineYamal

🌐 https://discord.gg/4BkKBqYyv3

${LINE}`
    );
}

// ============================================================
// 🛡️ ADMIN HELP
// ============================================================

function adminMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("admin_menu")
        .setPlaceholder(
          "Selecciona una categoría administrativa"
        )
        .addOptions(

          new StringSelectMenuOptionBuilder()
            .setLabel("Configuración")
            .setDescription(
              "Configura el bot"
            )
            .setValue("config")
            .setEmoji("⚙️"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Tickets")
            .setDescription(
              "Administración del sistema de tickets"
            )
            .setValue("ticket_admin")
            .setEmoji("🎫"),

          new StringSelectMenuOptionBuilder()
            .setLabel("Comandos")
            .setDescription(
              "Comandos exclusivos de administración"
            )
            .setValue("admin_commands")
            .setEmoji("🛡️")
        )
    );
}

function adminEmbed(category) {

  if (category === "config") {
    return new EmbedBuilder()
      .setColor(COLORS.admin)
      .setTitle("⚙️ Configuración")
      .setDescription(
`${LINE}

**s.bienvenidas #canal**
Configura las bienvenidas.

**s.invites #canal**
Configura el canal de invitaciones.

**s.ticket**
Publica el panel de tickets.

${LINE}`
      );
  }

  if (category === "ticket_admin") {
    return new EmbedBuilder()
      .setColor(COLORS.ticket)
      .setTitle("🎫 Administración de Tickets")
      .setDescription(
`${LINE}

Los tickets pueden ser vistos por:

<@&${STAFF_ROLE_1}>
<@&${STAFF_ROLE_2}>

El creador del ticket también tendrá acceso.

**s.ticket**
Publica el panel de soporte.

${LINE}`
      );
  }

  return new EmbedBuilder()
    .setColor(COLORS.admin)
    .setTitle("🛡️ Administración")
    .setDescription(
`${LINE}

**s.say <mensaje>**
Envía un mensaje mediante el bot.

**s.bienvenidas #canal**
Configura las bienvenidas.

**s.invites #canal**
Configura las invitaciones.

**s.ticket**
Publica el panel de tickets.

${LINE}

⚠️ Todos estos comandos requieren **Administrador**.`
    );
}

// ============================================================
// 🎫 PREGUNTAS
// ============================================================

const ticketQuestions = {
  general: [
    "¿Cuál es tu nick de Minecraft?",
    "¿Cuál es tu problema?"
  ],

  reporte: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿A quién quieres reportar y por qué?"
  ],

  duda: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Qué duda tienes?"
  ],

  bug: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Cuál es el bug?"
  ],

  alianza: [
    "¿Cómo se llama tu servidor?",
    "¿Cumple con los requisitos?"
  ],

  tienda: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Qué quieres comprar?"
  ],

  password: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Por qué quieres actualizarla?"
  ],

  apelacion: [
    "¿Cuál es tu nombre de Minecraft?",
    "¿Por qué quieres apelar la sanción?"
  ]
};

const ticketNames = {
  general: "general",
  reporte: "reporte",
  duda: "duda",
  bug: "bug",
  alianza: "alianza",
  tienda: "tienda",
  password: "restablecer",
  apelacion: "apelacion"
};

// ============================================================
// 🎫 PANEL DE TICKETS
// ============================================================

function ticketPanel() {

  const embed = new EmbedBuilder()
    .setColor(COLORS.ticket)
    .setTitle("🎫 Centro de Soporte — SylenMC")
    .setDescription(
`¡**Hola, Somos el equipo de Soporte de SylenMC**!

Si tenés una queja o duda, acá puedes crear un ticket y hablar sobre el problema con un Staff.

**SOPORTE 24/7**
${LINE}

${EMOJIS.diamante} **General**
${EMOJIS.hardcore} **Reporte**
${EMOJIS.duda} **Duda**
${EMOJIS.engranaje} **Bug**
${EMOJIS.minecraft} **Alianza**
${EMOJIS.hacha} **Tienda**
${EMOJIS.tridente} **Restablecer contraseña**
${EMOJIS.hacha} **Apelar sanción**

${LINE}

**¿No te atendemos?**

Si no te atendemos, solo ten paciencia.
Hay veces que el Staff está ocupado, pero no te preocupes, es solo cuestión de tiempo.

https://skinmc.net/achievement/19/CENTRO+DE+SOPORTE/Seleccione+su+categoría`
    )
    .setFooter({
      text: "SylenMC Support"
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder(
      "🎫 Selecciona una categoría"
    )
    .addOptions(

      new StringSelectMenuOptionBuilder()
        .setLabel("General")
        .setDescription(
          "Problemas generales"
        )
        .setValue("general")
        .setEmoji({
          name: "BLOQUE_DIAMANTE",
          id: "1422407517056536656"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Reporte")
        .setDescription(
          "Reportar a un jugador"
        )
        .setValue("reporte")
        .setEmoji({
          name: "HARCORED",
          id: "1422591052770050058"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Duda")
        .setDescription(
          "Resolver una duda"
        )
        .setValue("duda")
        .setEmoji({
          name: "interrogacion",
          id: "1422591514327908386"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Bug")
        .setDescription(
          "Reportar un bug"
        )
        .setValue("bug")
        .setEmoji({
          name: "ENGRANAJE",
          id: "1422592111819231382"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Alianza")
        .setDescription(
          "Solicitar una alianza"
        )
        .setValue("alianza")
        .setEmoji({
          name: "MINECRAFT",
          id: "1422411326403117127"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Tienda")
        .setDescription(
          "Consultas de tienda"
        )
        .setValue("tienda")
        .setEmoji({
          name: "HACHA",
          id: "1422410643985661995"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Restablecer contraseña")
        .setDescription(
          "Actualizar contraseña"
        )
        .setValue("password")
        .setEmoji({
          name: "TRIDENTE",
          id: "1422412335720435765"
        }),

      new StringSelectMenuOptionBuilder()
        .setLabel("Apelar sanción")
        .setDescription(
          "Apelar una sanción"
        )
        .setValue("apelacion")
        .setEmoji({
          name: "HACHA",
          id: "1422410643985661995"
        })
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  };
}

// ============================================================
// 🎫 CREAR TICKET
// ============================================================

async function createTicket(
  interaction,
  type,
  answers
) {
  try {
    const guild = interaction.guild;
    const member = interaction.member;

    const existing =
      guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.topic ===
            `ticket-owner:${member.id}`
      );

    if (existing) {
      return interaction.reply({
        content:
          `❌ Ya tienes un ticket abierto: ${existing}`,
        ephemeral: true
      });
    }

    let category =
      guild.channels.cache.find(
        channel =>
          channel.type ===
            ChannelType.GuildCategory &&
          channel.name.toLowerCase() ===
            "tickets"
      );

    if (!category) {
      category =
        await guild.channels.create({
          name: "TICKETS",
          type: ChannelType.GuildCategory
        });
    }

    const categoryName =
      ticketNames[type] || "ticket";

    const safeUsername =
      member.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);

    const channelName =
      `ticket-${categoryName}-${safeUsername}`
        .slice(0, 100);

    const ticketChannel =
      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        topic:
          `ticket-owner:${member.id}`,

        permissionOverwrites: [

          {
            id: guild.roles.everyone.id,
            deny: [
              PermissionsBitField.Flags.ViewChannel
            ]
          },

          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles
            ]
          },

          {
            id: STAFF_ROLE_1,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          },

          {
            id: STAFF_ROLE_2,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ]
      });

    let questionsText = "";

    ticketQuestions[type].forEach(
      (question, index) => {
        questionsText +=
`\n**${index + 1}. ${question}**
> ${answers[index] || "Sin respuesta"}\n`;
      }
    );

    const closeButton =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              "ticket_close"
            )
            .setLabel(
              "Cerrar ticket"
            )
            .setEmoji("🔒")
            .setStyle(
              ButtonStyle.Danger
            )
        );

    const embed =
      new EmbedBuilder()
        .setColor(COLORS.ticket)
        .setTitle(
          `🎫 Ticket — ${ticketNames[type]}`
        )
        .setDescription(
`${member}

<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>

${EMOJIS.loro} Gracias por abrir un ticket y comunicarte con el equipo de soporte de **SylenMC**.

${EMOJIS.reloj} El Staff se pondrá en contacto contigo lo antes posible.

${EMOJIS.minecraft2} **Preguntas:**

${questionsText}

${EMOJIS.reloj} Espera pacientemente a un Staff.

${LINE}`
        )
        .setTimestamp();

    await ticketChannel.send({
      embeds: [embed],
      components: [closeButton]
    });

    return interaction.reply({
      content:
        `✅ Tu ticket fue creado correctamente: ${ticketChannel}`,
      ephemeral: true
    });

  } catch (error) {

    console.error(
      "❌ Error creando ticket:",
      error
    );

    if (!interaction.replied) {
      return interaction.reply({
        content:
          "❌ No pude crear el ticket. Revisa los permisos del bot.",
        ephemeral: true
      });
    }
  }
}

// ============================================================
// 💬 MESSAGE CREATE
// ============================================================

client.on(
  "messageCreate",
  async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    if (
      !message.content
        .toLowerCase()
        .startsWith(PREFIX)
    ) {
      return;
    }

    const args =
      message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command =
      args.shift()?.toLowerCase();

    if (!command) return;

    const user =
      getUser(message.author.id);

    const guildConfig =
      getGuild(message.guild.id);

    // ========================================================
    // 📚 HELP
    // ========================================================

    if (command === "help") {
      return message.channel.send({
        embeds: [
          helpEmbed("main")
        ],
        components: [
          helpMenu()
        ]
      });
    }

    // ========================================================
    // 🛡️ ADMIN
    // ========================================================

    if (command === "admin") {

      if (!isAdmin(message.member)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription(
                "❌ Solo los usuarios con **Administrador** pueden utilizar `s.admin`."
              )
          ]
        });
      }

      return message.channel.send({
        embeds: [
          adminEmbed("main")
        ],
        components: [
          adminMenu()
        ]
      });
    }

    // ========================================================
    // 🎫 TICKET
    // ========================================================

    if (command === "ticket") {

      try {

        const panel =
          ticketPanel();

        return message.channel.send({
          embeds: panel.embeds,
          components: panel.components
        });

      } catch (error) {

        console.error(
          "❌ Error en s.ticket:",
          error
        );

        return message.reply(
          "❌ No pude enviar el panel de tickets."
        );
      }
    }

    // ========================================================
    // 📢 SAY — SOLO ADMIN
    // ========================================================

    if (command === "say") {

      if (!isAdmin(message.member)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.error)
              .setDescription(
                "❌ Necesitas tener **Administrador** para usar `s.say`."
              )
          ]
        });
      }

      const text =
        args.join(" ").trim();

      if (!text) {
        return message.reply(
          "❌ Uso correcto: `s.say <mensaje>`"
        );
      }

      try {

        await message.delete()
          .catch(() => {});

        return message.channel.send({
          content: text,
          allowedMentions: {
            parse: []
          }
        });

      } catch (error) {

        console.error(
          "❌ Error en s.say:",
          error
        );

        return;
      }
    }

    // ========================================================
    // 👋 BIENVENIDAS — ADMIN
    // ========================================================

    if (command === "bienvenidas") {

      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Necesitas tener **Administrador**."
        );
      }

      const channel =
        message.mentions.channels.first();

      if (!channel) {
        return message.reply(
          "❌ Uso correcto: `s.bienvenidas #canal`"
        );
      }

      guildConfig.welcomeChannel =
        channel.id;

      saveDB();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle("👋 Bienvenidas configuradas")
            .setDescription(
              `Las bienvenidas se enviarán en ${channel}.`
            )
        ]
      });
    }

    // ========================================================
    // 📨 INVITES — ADMIN
    // ========================================================

    if (command === "invites") {

      if (!isAdmin(message.member)) {
        return message.reply(
          "❌ Necesitas tener **Administrador**."
        );
      }

      const channel =
        message.mentions.channels.first();

      if (!channel) {
        return message.reply(
          "❌ Uso correcto: `s.invites #canal`"
        );
      }

      guildConfig.inviteChannel =
        channel.id;

      saveDB();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle("📨 Invitaciones configuradas")
            .setDescription(
              `Los mensajes de invitación se enviarán en ${channel}.`
            )
        ]
      });
    }

    // ========================================================
    // 💰 BALANCE
    // ========================================================

    if (
      command === "balance" ||
      command === "bal"
    ) {

      return message.reply({
        embeds: [
          economyEmbed(
            "Tu economía",
`👤 Usuario: ${message.author}

💵 Wallet:
**$${formatMoney(user.wallet)}**

🏦 Banco:
**$${formatMoney(user.bank)}**

💳 Total:
**$${formatMoney(
  user.wallet + user.bank
)}**`
          )
        ]
      });
    }

    // ========================================================
    // 💼 WORK
    // ========================================================

    if (command === "work") {

      const remaining =
        checkCooldown(
          message.author.id,
          "work",
          30
        );

      if (remaining) {
        return message.reply({
          embeds: [
            economyEmbed(
              "⏳ Trabajo",
              `Debes esperar **${remaining}s** antes de volver a trabajar.`
            )
          ]
        });
      }

      const amount =
        random(50, 100);

      user.wallet += amount;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "💼 Trabajo completado",
`👤 ${message.author}

Has trabajado y recibido:

💵 **+$${formatMoney(amount)}**

💰 Wallet actual:
**$${formatMoney(user.wallet)}**`
          )
        ]
      });
    }

    // ========================================================
    // 🎲 SLUT
    // ========================================================

    if (command === "slut") {

      const remaining =
        checkCooldown(
          message.author.id,
          "slut",
          60
        );

      if (remaining) {
        return message.reply({
          embeds: [
            economyEmbed(
              "⏳ Cooldown",
              `Espera **${remaining}s** para volver a utilizar este comando.`
            )
          ]
        });
      }

      const amount =
        random(100, 200);

      if (Math.random() <= 0.20) {

        user.wallet += amount;

        saveDB();

        return message.reply({
          embeds: [
            economyEmbed(
              "🎉 ¡Ganaste!",
              `Has ganado **$${formatMoney(amount)}**.

💰 Wallet:
**$${formatMoney(user.wallet)}**`
            )
          ]
        });
      }

      const loss =
        Math.min(
          random(100, 200),
          user.wallet
        );

      user.wallet -= loss;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "❌ Perdiste",
            `Has perdido **$${formatMoney(loss)}**.

💰 Wallet:
**$${formatMoney(user.wallet)}**`
          )
        ]
      });
    }

    // ========================================================
    // 🔫 CRIME
    // ========================================================

    if (command === "crime") {

      const remaining =
        checkCooldown(
          message.author.id,
          "crime",
          120
        );

      if (remaining) {
        return message.reply({
          embeds: [
            economyEmbed(
              "⏳ Cooldown",
              `Espera **${remaining}s** para volver a utilizar este comando.`
            )
          ]
        });
      }

      if (Math.random() <= 0.15) {

        const amount =
          random(200, 450);

        user.wallet += amount;

        saveDB();

        return message.reply({
          embeds: [
            economyEmbed(
              "💰 ¡Crimen exitoso!",
              `El crimen salió bien.

💵 Ganaste:
**+$${formatMoney(amount)}**`
            )
          ]
        });
      }

      const loss =
        Math.min(
          random(200, 500),
          user.wallet
        );

      user.wallet -= loss;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "🚔 Crimen fallido",
            `El crimen salió mal.

💸 Perdiste:
**-$${formatMoney(loss)}**`
          )
        ]
      });
    }

    // ========================================================
    // 🎁 DAILY
    // ========================================================

    if (command === "daily") {

      const remaining =
        checkCooldown(
          message.author.id,
          "daily",
          86400
        );

      if (remaining) {

        const hours =
          Math.floor(
            remaining / 3600
          );

        const minutes =
          Math.floor(
            (remaining % 3600) / 60
          );

        return message.reply({
          embeds: [
            economyEmbed(
              "🎁 Recompensa diaria",
              `Ya reclamaste tu recompensa.

⏳ Vuelve en:
**${hours}h ${minutes}m**`
            )
          ]
        });
      }

      user.wallet += 500;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "🎁 Recompensa recibida",
            `Has recibido:

💵 **+$500**

💰 Wallet:
**$${formatMoney(user.wallet)}**`
          )
        ]
      });
    }

    // ========================================================
    // 🏦 DEP
    // ========================================================

    if (
      command === "dep" ||
      command === "deposit"
    ) {

      const amount =
        parseAmount(
          args[0],
          user
        );

      if (!amount || amount <= 0) {
        return message.reply(
          "❌ Usa `s.dep <cantidad/all>`."
        );
      }

      if (amount > user.wallet) {
        return message.reply({
          embeds: [
            economyEmbed(
              "❌ Dinero insuficiente",
              "No tienes suficiente dinero en tu wallet."
            )
          ]
        });
      }

      user.wallet -= amount;
      user.bank += amount;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "🏦 Depósito realizado",
`Has depositado:

**$${formatMoney(amount)}**

🏦 Banco:
**$${formatMoney(user.bank)}**`
          )
        ]
      });
    }

    // ========================================================
    // 🪙 COINFLIP
    // ========================================================

    if (command === "coinflip") {

      const amount =
        parseAmount(
          args[0],
          user
        );

      if (!amount || amount <= 0) {
        return message.reply(
          "❌ Usa `s.coinflip <cantidad>`."
        );
      }

      if (amount > user.wallet) {
        return message.reply(
          "❌ No tienes suficiente dinero."
        );
      }

      const remaining =
        checkCooldown(
          message.author.id,
          "coinflip",
          10
        );

      if (remaining) {
        return message.reply(
          `⏳ Espera **${remaining}s**.`
        );
      }

      user.wallet -= amount;

      if (Math.random() < 0.5) {

        user.wallet += amount * 2;

        return message.reply({
          embeds: [
            economyEmbed(
              "🪙 Cara",
              `🎉 Ganaste **$${formatMoney(amount)}**.`
            )
          ]
        });

      } else {

        saveDB();

        return message.reply({
          embeds: [
            economyEmbed(
              "🪙 Cruz",
              `❌ Perdiste **$${formatMoney(amount)}**.`
            )
          ]
        });
      }
    }

    // ========================================================
    // 🎲 DICE
    // ========================================================

    if (command === "dice") {

      const amount =
        parseAmount(
          args[0],
          user
        );

      if (!amount || amount <= 0) {
        return message.reply(
          "❌ Usa `s.dice <cantidad>`."
        );
      }

      if (amount > user.wallet) {
        return message.reply(
          "❌ No tienes suficiente dinero."
        );
      }

      const remaining =
        checkCooldown(
          message.author.id,
          "dice",
          10
        );

      if (remaining) {
        return message.reply(
          `⏳ Espera **${remaining}s**.`
        );
      }

      user.wallet -= amount;

      const playerRoll =
        random(1, 6);

      const botRoll =
        random(1, 6);

      if (playerRoll > botRoll) {

        user.wallet +=
          amount * 2;

        saveDB();

        return message.reply({
          embeds: [
            economyEmbed(
              "🎲 ¡Ganaste!",
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

🎉 Ganaste **$${formatMoney(amount)}**.`
            )
          ]
        });
      }

      if (playerRoll === botRoll) {

        user.wallet += amount;

        saveDB();

        return message.reply({
          embeds: [
            economyEmbed(
              "🤝 Empate",
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

Recuperaste tu apuesta.`
            )
          ]
        });
      }

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "❌ Perdiste",
`🎲 Tú: **${playerRoll}**
🤖 Bot: **${botRoll}**

Perdiste **$${formatMoney(amount)}**.`
          )
        ]
      });
    }

    // ========================================================
    // 🏴 ROB
    // ========================================================

    if (command === "rob") {

      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          "❌ Usa `s.rob @usuario`."
        );
      }

      if (
        target.id ===
        message.author.id
      ) {
        return message.reply(
          "❌ No puedes robarte a ti mismo."
        );
      }

      const remaining =
        checkCooldown(
          message.author.id,
          "rob",
          300
        );

      if (remaining) {
        return message.reply(
          `⏳ Espera **${remaining}s**.`
        );
      }

      const targetData =
        getUser(target.id);

      if (targetData.wallet <= 0) {
        return message.reply(
          "❌ Ese usuario no tiene dinero en su wallet."
        );
      }

      if (Math.random() > 0.30) {
        return message.reply({
          embeds: [
            economyEmbed(
              "🚨 Robo fallido",
              "Intentaste robar, pero fallaste."
            )
          ]
        });
      }

      const amount =
        random(
          1,
          Math.max(
            1,
            Math.min(
              targetData.wallet,
              500
            )
          )
        );

      targetData.wallet -= amount;
      user.wallet += amount;

      saveDB();

      return message.reply({
        embeds: [
          economyEmbed(
            "🏴 Robo exitoso",
            `Robaste **$${formatMoney(amount)}** a ${target}.`
          )
        ]
      });
    }

    // ========================================================
    // 👤 INFO USER
    // ========================================================

    if (command === "infouser") {

      const target =
        message.mentions.users.first() ||
        message.author;

      return message.reply({
        embeds: [
          userInfoEmbed(target)
        ]
      });
    }

    // ========================================================
    // 🤖 BOT INFO
    // ========================================================

    if (command === "infobot") {

      const embed =
        new EmbedBuilder()
          .setColor(COLORS.main)
          .setTitle("🤖 SylenMC Bot")
          .setDescription(
`${LINE}

**🤖 Bot de SylenMC**
**👤 Creador de SylenMC:** zRyker
**⚙️ Creador del Bot:** LamineYamal

🌌 Prefix: \`s.\`

👾 https://discord.gg/4BkKBqYyv3

${LINE}`
          )
          .addFields(
            {
              name: "🌐 Servidores",
              value:
                `${client.guilds.cache.size}`,
              inline: true
            },
            {
              name: "👥 Usuarios",
              value:
                `${client.guilds.cache.reduce(
                  (total, guild) =>
                    total +
                    guild.memberCount,
                  0
                )}`,
              inline: true
            }
          )
          .setTimestamp();

      return message.reply({
        embeds: [embed]
      });
    }

    // ========================================================
    // 🏠 SERVER INFO
    // ========================================================

    if (
      command === "infoserver" ||
      command === "serverinfo"
    ) {

      const guild =
        message.guild;

      const embed =
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(
            `🏠 ${guild.name}`
          )
          .setThumbnail(
            guild.iconURL({
              dynamic: true
            })
          )
          .addFields(
            {
              name: "👥 Miembros",
              value:
                `${guild.memberCount}`,
              inline: true
            },
            {
              name: "💬 Canales",
              value:
                `${guild.channels.cache.size}`,
              inline: true
            },
            {
              name: "🎭 Roles",
              value:
                `${guild.roles.cache.size}`,
              inline: true
            },
            {
              name: "🆔 ID",
              value:
                `\`${guild.id}\``,
              inline: true
            },
            {
              name: "📅 Creado",
              value:
                `<t:${Math.floor(
                  guild.createdTimestamp /
                    1000
                )}:F>`,
              inline: true
            }
          )
          .setTimestamp();

      return message.reply({
        embeds: [embed]
      });
    }

    // ========================================================
    // 🖼️ ICON
    // ========================================================

    if (
      command === "infoicon" ||
      command === "servericon"
    ) {

      return message.reply(
        message.guild.iconURL({
          extension: "png",
          size: 4096
        }) ||
        "❌ El servidor no tiene icono."
      );
    }
  }
);

// ============================================================
// 🎛️ INTERACCIONES
// ============================================================

client.on(
  "interactionCreate",
  async interaction => {

    // ========================================================
    // 📚 HELP MENU
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        "help_menu"
    ) {

      return interaction.update({
        embeds: [
          helpEmbed(
            interaction.values[0]
          )
        ],
        components: [
          helpMenu()
        ]
      });
    }

    // ========================================================
    // 🛡️ ADMIN MENU
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        "admin_menu"
    ) {

      if (
        !isAdmin(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "❌ Necesitas tener **Administrador**.",
          ephemeral: true
        });
      }

      return interaction.update({
        embeds: [
          adminEmbed(
            interaction.values[0]
          )
        ],
        components: [
          adminMenu()
        ]
      });
    }

    // ========================================================
    // 🎫 TICKET SELECT
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        "ticket_select"
    ) {

      const type =
        interaction.values[0];

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildText &&
            channel.topic ===
              `ticket-owner:${interaction.user.id}`
        );

      if (existing) {
        return interaction.reply({
          content:
            `❌ Ya tienes un ticket abierto: ${existing}`,
          ephemeral: true
        });
      }

      const questions =
        ticketQuestions[type];

      const modal =
        new ModalBuilder()
          .setCustomId(
            `ticket_modal_${type}`
          )
          .setTitle(
            `Ticket: ${ticketNames[type]}`
          );

      questions.forEach(
        (question, index) => {

          const input =
            new TextInputBuilder()
              .setCustomId(
                `answer_${index}`
              )
              .setLabel(
                question.length > 45
                  ? question.slice(
                      0,
                      42
                    ) + "..."
                  : question
              )
              .setPlaceholder(
                "Escribe tu respuesta..."
              )
              .setStyle(
                index === 0
                  ? TextInputStyle.Short
                  : TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );
        }
      );

      return interaction.showModal(
        modal
      );
    }

    // ========================================================
    // 📝 TICKET MODAL
    // ========================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith(
        "ticket_modal_"
      )
    ) {

      const type =
        interaction.customId.replace(
          "ticket_modal_",
          ""
        );

      const answers = [];

      ticketQuestions[type].forEach(
        (_, index) => {

          answers.push(
            interaction.fields.getTextInputValue(
              `answer_${index}`
            )
          );
        }
      );

      return createTicket(
        interaction,
        type,
        answers
      );
    }

    // ========================================================
    // 🔒 CLOSE TICKET
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "ticket_close"
    ) {

      const staff =
        isAdmin(
          interaction.member
        ) ||
        interaction.member.roles.cache.has(
          STAFF_ROLE_1
        ) ||
        interaction.member.roles.cache.has(
          STAFF_ROLE_2
        );

      if (!staff) {
        return interaction.reply({
          content:
            "❌ Solo un Staff puede cerrar este ticket.",
          ephemeral: true
        });
      }

      await interaction.reply(
        "🔒 Cerrando ticket..."
      );

      setTimeout(() => {
        interaction.channel
          .delete()
          .catch(() => {});
      }, 1500);

      return;
    }
  }
);

// ============================================================
// 🚨 ERRORES
// ============================================================

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!TOKEN) {

  console.error(
    "❌ ERROR: No existe DISCORD_TOKEN en las variables de entorno."
  );

  process.exit(1);
}

client
  .login(TOKEN)
  .then(() => {
    console.log(
      "🔑 Login realizado correctamente."
    );
  })
  .catch(error => {
    console.error(
      "❌ Error iniciando sesión:",
      error
    );
  });
