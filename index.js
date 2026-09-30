// ============================================================
// 🤖 SYLENMC BOT
// Prefix: S.
// Discord.js v14
// ============================================================

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "S.";

const DATA_FILE = path.join(__dirname, "sylenmc-data.json");

// Canales que aparecen en el mensaje de bienvenida.
// Puedes poner los IDs reales de tus canales aquí.
const RULES_DC_ID = "PON_AQUI_ID_REGLAS_DC";
const RULES_MC_ID = "PON_AQUI_ID_REGLAS_MC";
const TICKET_ID = "PON_AQUI_ID_CREAR_TICKET";

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("SylenMC Bot está funcionando correctamente.");
}).listen(PORT, () => {
    console.log(`🌐 Servidor HTTP activo en el puerto ${PORT}`);
});

// ============================================================
// 💾 DATOS
// ============================================================

let database = {
    guilds: {},
    users: {}
};

if (fs.existsSync(DATA_FILE)) {
    try {
        database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

        if (!database.guilds) database.guilds = {};
        if (!database.users) database.users = {};

    } catch (error) {
        console.log("⚠️ Error leyendo sylenmc-data.json. Se creará uno nuevo.");
        database = {
            guilds: {},
            users: {}
        };
    }
}

function saveDatabase() {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(database, null, 4),
        "utf8"
    );
}

// ============================================================
// 👤 DATOS DE USUARIO
// ============================================================

function getUser(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            wallet: 1000,
            bank: 0,
            lastWork: 0,
            lastSlut: 0,
            lastCrime: 0,
            lastDaily: 0,
            lastRob: 0,
            lastCoinflip: 0,
            lastDice: 0
        };

        saveDatabase();
    }

    return database.users[userId];
}

// ============================================================
// 🏠 DATOS DEL SERVIDOR
// ============================================================

function getGuild(guildId) {
    if (!database.guilds[guildId]) {
        database.guilds[guildId] = {
            welcomeChannel: null,
            inviteChannel: null
        };

        saveDatabase();
    }

    return database.guilds[guildId];
}

// ============================================================
// ⏱️ COOLDOWN
// ============================================================

function cooldownRemaining(lastTime, cooldown) {
    const remaining = cooldown - (Date.now() - lastTime);

    return remaining > 0 ? remaining : 0;
}

function formatTime(ms) {
    const seconds = Math.ceil(ms / 1000);

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.ceil(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.ceil(minutes / 60);

    return `${hours}h`;
}

// ============================================================
// 💰 FORMATO DE DINERO
// ============================================================

function money(amount) {
    return `${amount.toLocaleString("es-ES")} monedas`;
}

// ============================================================
// 🎲 RANDOM
// ============================================================

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent) {
    return Math.random() * 100 < percent;
}

// ============================================================
// 🤖 CLIENTE
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites
    ]
});

// ============================================================
// 📩 INVITACIONES
// ============================================================

const inviteCache = new Map();

async function cacheGuildInvites(guild) {
    try {
        const invites = await guild.invites.fetch();

        const inviteData = new Map();

        invites.forEach(invite => {
            inviteData.set(invite.code, {
                uses: invite.uses || 0,
                inviterId: invite.inviter?.id || null
            });
        });

        inviteCache.set(guild.id, inviteData);

    } catch (error) {
        console.log(
            `⚠️ No se pudieron obtener las invitaciones de ${guild.name}.`
        );
    }
}

client.on("inviteCreate", async invite => {
    try {
        await cacheGuildInvites(invite.guild);
    } catch {}
});

client.on("inviteDelete", async invite => {
    try {
        await cacheGuildInvites(invite.guild);
    } catch {}
});

// ============================================================
// 🚀 READY
// ============================================================

client.once("ready", async () => {
    console.log("============================================");
    console.log("🤖 SylenMC Bot está conectado correctamente.");
    console.log(`👤 Bot: ${client.user.tag}`);
    console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
    console.log("============================================");

    client.user.setActivity("SylenMC | S.help");

    for (const guild of client.guilds.cache.values()) {
        await cacheGuildInvites(guild);
    }
});

// ============================================================
// 👋 BIENVENIDAS + INVITES
// ============================================================

client.on("guildMemberAdd", async member => {
    const guildConfig = getGuild(member.guild.id);

    let inviterId = null;
    let inviteCount = 0;

    try {
        const oldInvites = inviteCache.get(member.guild.id);

        const newInvites = await member.guild.invites.fetch();

        let usedInvite = null;

        if (oldInvites) {
            for (const invite of newInvites.values()) {
                const oldInvite = oldInvites.get(invite.code);

                if (
                    oldInvite &&
                    (invite.uses || 0) > oldInvite.uses
                ) {
                    usedInvite = invite;
                    break;
                }
            }
        }

        if (usedInvite) {
            inviterId = usedInvite.inviter?.id || null;

            if (inviterId) {
                const inviter = getUser(inviterId);

                if (!inviter.invites) {
                    inviter.invites = {};
                }

                if (!inviter.invites[member.guild.id]) {
                    inviter.invites[member.guild.id] = 0;
                }

                inviter.invites[member.guild.id]++;

                inviteCount =
                    inviter.invites[member.guild.id];

                saveDatabase();
            }
        }

        await cacheGuildInvites(member.guild);

    } catch (error) {
        console.log("⚠️ Error comprobando invitación:", error.message);
    }

    // --------------------------------------------------------
    // 👋 BIENVENIDA
    // --------------------------------------------------------

    if (guildConfig.welcomeChannel) {
        const channel =
            member.guild.channels.cache.get(
                guildConfig.welcomeChannel
            );

        if (channel && channel.isTextBased()) {

            const rulesDC =
                RULES_DC_ID.startsWith("PON_")
                    ? "#『📔』reglas┆dc"
                    : `<#${RULES_DC_ID}>`;

            const rulesMC =
                RULES_MC_ID.startsWith("PON_")
                    ? "#『📖』reglas┆mc"
                    : `<#${RULES_MC_ID}>`;

            const ticket =
                TICKET_ID.startsWith("PON_")
                    ? "#『📬』crear┆ticket"
                    : `<#${TICKET_ID}>`;

            const welcomeMessage = [
                `👋 ¡Bienvenido <@${member.id}> a **SylenMC**!`,
                "",
                `\`Eres nuestro usuario número\` **${member.guild.memberCount}** 👥`,
                "",
                "Aquí puedes **divertirte** con más gente.",
                "",
                `Te recomiendo leer las reglas ${rulesDC} y ${rulesMC} para evitar ser **sancionado**.`,
                "",
                `Si tienes alguna duda o quieres reportar algo, crea un ticket en ${ticket}.`,
                "",
                "**IP DEL SERVIDOR**",
                "",
                "IP: `sylenmc.diavlohosting.com`",
                "Puerto: `19016`",
                "Java y Bedrock",
                "",
                "Gracias por unirte al servidor. Recuerda invitar a tus amigos para ayudar a mejorar la comunidad. 🎉"
            ].join("\n");

            channel.send({
                content: welcomeMessage
            }).catch(() => {});
        }
    }

    // --------------------------------------------------------
    // 📩 INVITACIONES
    // --------------------------------------------------------

    if (guildConfig.inviteChannel && inviterId) {

        const channel =
            member.guild.channels.cache.get(
                guildConfig.inviteChannel
            );

        if (channel && channel.isTextBased()) {

            channel.send({
                content:
                    `<@${member.id}> ¡Bienvenido a **SylenMC**! 🤩\n\n` +
                    `Fuiste invitado por <@${inviterId}>.\n\n` +
                    `Ahora tienes **${inviteCount} invitaciones** y eres nuestro jugador número **${member.guild.memberCount}**. 👥`
            }).catch(() => {});
        }
    }
});

// ============================================================
// 📚 HELP
// ============================================================

function helpMenu() {

    const embed = new EmbedBuilder()
        .setTitle("📚 SylenMc Bot | Ayuda")
        .setDescription(
            "Selecciona una categoría en el menú de abajo para ver los comandos disponibles."
        )
        .setFooter({
            text: "SylenMC • Usa S.help"
        });

    const menu = new StringSelectMenuBuilder()
        .setCustomId("help_menu")
        .setPlaceholder("Selecciona una categoría")
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Información")
                .setDescription("Comandos de información")
                .setEmoji("🌐")
                .setValue("info"),

            new StringSelectMenuOptionBuilder()
                .setLabel("Economía")
                .setDescription("Dinero, apuestas y juegos")
                .setEmoji("💰")
                .setValue("economy")
        );

    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(menu)
        ]
    };
}

// ============================================================
// 🌐 INFO
// ============================================================

function infoEmbed() {

    return new EmbedBuilder()
        .setTitle("🌐 SylenMC | Información")
        .setDescription(
            [
                "**🤖 Bot**",
                "`S.infobot`",
                "",
                "**🏠 Servidor**",
                "`S.infoserver`",
                "",
                "**🖼️ Icono**",
                "`S.infoicon`",
                "",
                "**👤 Usuario**",
                "`S.infouser [@usuario]`"
            ].join("\n")
        )
        .setFooter({
            text: "SylenMC • Información"
        });
}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

function economyEmbed() {

    return new EmbedBuilder()
        .setTitle("💰 SylenMC | Economía")
        .setDescription(
            [
                "**💼 Trabajo**",
                "`S.work` — Gana 50–100 monedas cada 30 segundos.",
                "",
                "**🎲 Slut**",
                "`S.slut` — 20% de ganar 100–200 monedas. Si pierdes, pierdes 100–200. Cooldown: 1 minuto.",
                "",
                "**🔫 Crime**",
                "`S.crime` — 15% de ganar 200–450 monedas. Si pierdes, pierdes 200–500. Cooldown: 2 minutos.",
                "",
                "**🎁 Daily**",
                "`S.daily` — Gana 500 monedas cada 24 horas.",
                "",
                "**🏦 Depositar**",
                "`S.dep <cantidad/all>` — Guarda tus monedas en el banco.",
                "",
                "**🃏 Blackjack**",
                "`S.bj <cantidad/all>` — Juega blackjack usando botones Hit y Stand.",
                "",
                "**🥷 Robar**",
                "`S.rob @usuario` — 30% de probabilidad de robar.",
                "",
                "**🪙 Coinflip**",
                "`S.coinflip <cantidad>` — Apuesta monedas a cara o cruz.",
                "",
                "**🎲 Dados**",
                "`S.dice <cantidad>` — Apuesta monedas en un juego de dados."
            ].join("\n")
        )
        .setFooter({
            text: "SylenMC • Economía"
        });
}

// ============================================================
// ⚙️ ADMIN
// ============================================================

function adminMenu() {

    const embed = new EmbedBuilder()
        .setTitle("⚙️ SylenMC | Panel Administrativo")
        .setDescription(
            "Selecciona una categoría administrativa."
        )
        .setFooter({
            text: "Solo administradores"
        });

    const menu = new StringSelectMenuBuilder()
        .setCustomId("admin_menu")
        .setPlaceholder("Selecciona una categoría")
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Configuración")
                .setDescription("Configura funciones del servidor")
                .setEmoji("⚙️")
                .setValue("config")
        );

    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(menu)
        ]
    };
}

// ============================================================
// 🔧 CONFIGURACIÓN ADMIN
// ============================================================

function configEmbed() {

    return new EmbedBuilder()
        .setTitle("⚙️ Configuración")
        .setDescription(
            [
                "**👋 Bienvenidas**",
                "`S.bienvenidas #canal`",
                "Configura el canal donde se enviarán las bienvenidas.",
                "",
                "**📩 Invitaciones**",
                "`S.invites #canal`",
                "Configura el canal donde se enviarán los mensajes de invitación."
            ].join("\n")
        )
        .setFooter({
            text: "SylenMC • Configuración"
        });
}

// ============================================================
// 📊 INFO BOT
// ============================================================

function botInfo(message) {

    const embed = new EmbedBuilder()
        .setTitle("🤖 Información del Bot")
        .setDescription(
            [
                "**🤖 Bot de SylenMC**",
                "",
                "**👤 Creador de SylenMC:** zRyker",
                "**⚙️ Creador del Bot:** LamineYamal",
                "**👾 Invitación:** https://discord.gg/4BkKBqYyv3"
            ].join("\n")
        )
        .addFields(
            {
                name: "📡 Ping",
                value: `${client.ws.ping}ms`,
                inline: true
            },
            {
                name: "🌐 Servidores",
                value: `${client.guilds.cache.size}`,
                inline: true
            },
            {
                name: "👥 Usuarios",
                value: `${client.users.cache.size}`,
                inline: true
            }
        );

    return embed;
}

// ============================================================
// 🏠 INFO SERVER
// ============================================================

function serverInfo(guild) {

    const owner = awaitOwner(guild);

    return new EmbedBuilder()
        .setTitle("🏠 Información del Servidor")
        .setDescription(
            [
                `**🏠 Nombre:** ${guild.name}`,
                `**🆔 ID:** ${guild.id}`,
                `**👥 Miembros:** ${guild.memberCount}`,
                `**💬 Canales:** ${guild.channels.cache.size}`,
                `**😀 Emojis:** ${guild.emojis.cache.size}`,
                `**🚀 Boosts:** ${guild.premiumSubscriptionCount || 0}`,
                `**👑 Dueño:** ${owner}`
            ].join("\n")
        );
}

function awaitOwner(guild) {
    return `<@${guild.ownerId}>`;
}

// ============================================================
// 🖼️ INFO ICON
// ============================================================

function iconInfo(guild) {

    return new EmbedBuilder()
        .setTitle("🖼️ Icono del servidor")
        .setDescription(
            `[Abrir icono](${guild.iconURL({
                size: 4096,
                extension: "png"
            }) || "https://discord.com"})`
        )
        .setImage(
            guild.iconURL({
                size: 1024,
                extension: "png"
            })
        );
}

// ============================================================
// 👤 INFO USER
// ============================================================

async function userInfo(user) {

    const member = await user.guild.members.fetch(user.id).catch(() => null);

    const accountCreated =
        `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;

    const joined =
        member?.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
            : "Desconocido";

    return new EmbedBuilder()
        .setTitle(`👤 Información de ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ size: 512 }))
        .setDescription(
            [
                `**👤 Usuario:** <@${user.id}>`,
                `**🆔 ID:** ${user.id}`,
                `**📅 Cuenta creada:** ${accountCreated}`,
                `**📥 Entró al servidor:** ${joined}`,
                `**🤖 Bot:** ${user.bot ? "Sí" : "No"}`
            ].join("\n")
        );
}

// ============================================================
// 💼 WORK
// ============================================================

async function commandWork(message) {

    const user = getUser(message.author.id);

    const cooldown = 30 * 1000;

    const remaining =
        cooldownRemaining(user.lastWork, cooldown);

    if (remaining) {
        return message.reply(
            `⏳ Debes esperar **${formatTime(remaining)}** para volver a trabajar.`
        );
    }

    const amount = random(50, 100);

    user.wallet += amount;
    user.lastWork = Date.now();

    saveDatabase();

    return message.reply(
        `💼 ${message.author}, trabajaste y ganaste **${money(amount)}**.`
    );
}

// ============================================================
// 🎲 SLUT
// ============================================================

async function commandSlut(message) {

    const user = getUser(message.author.id);

    const cooldown = 60 * 1000;

    const remaining =
        cooldownRemaining(user.lastSlut, cooldown);

    if (remaining) {
        return message.reply(
            `⏳ Debes esperar **${formatTime(remaining)}** para usar este comando otra vez.`
        );
    }

    user.lastSlut = Date.now();

    if (chance(20)) {

        const amount = random(100, 200);

        user.wallet += amount;

        saveDatabase();

        return message.reply(
            `🎉 ${message.author}, ganaste **${money(amount)}**.`
        );
    }

    const loss = Math.min(
        random(100, 200),
        user.wallet
    );

    user.wallet -= loss;

    saveDatabase();

    return message.reply(
        `❌ ${message.author}, perdiste **${money(loss)}**.`
    );
}

// ============================================================
// 🔫 CRIME
// ============================================================

async function commandCrime(message) {

    const user = getUser(message.author.id);

    const cooldown = 2 * 60 * 1000;

    const remaining =
        cooldownRemaining(user.lastCrime, cooldown);

    if (remaining) {
        return message.reply(
            `⏳ Debes esperar **${formatTime(remaining)}** para volver a usar crime.`
        );
    }

    user.lastCrime = Date.now();

    if (chance(15)) {

        const amount = random(200, 450);

        user.wallet += amount;

        saveDatabase();

        return message.reply(
            `🎉 El crimen salió bien. Ganaste **${money(amount)}**.`
        );
    }

    const loss = Math.min(
        random(200, 500),
        user.wallet
    );

    user.wallet -= loss;

    saveDatabase();

    return message.reply(
        `🚨 El crimen salió mal. Perdiste **${money(loss)}**.`
    );
}

// ============================================================
// 🎁 DAILY
// ============================================================

async function commandDaily(message) {

    const user = getUser(message.author.id);

    const cooldown = 24 * 60 * 60 * 1000;

    const remaining =
        cooldownRemaining(user.lastDaily, cooldown);

    if (remaining) {
        return message.reply(
            `⏳ Ya reclamaste tu recompensa. Espera **${formatTime(remaining)}**.`
        );
    }

    user.wallet += 500;
    user.lastDaily = Date.now();

    saveDatabase();

    return message.reply(
        `🎁 ${message.author}, recibiste **500 monedas** de recompensa diaria.`
    );
}

// ============================================================
// 🏦 DEP
// ============================================================

async function commandDeposit(message, args) {

    const user = getUser(message.author.id);

    if (!args[0]) {
        return message.reply(
            "❌ Usa `S.dep <cantidad>` o `S.dep all`."
        );
    }

    let amount;

    if (args[0].toLowerCase() === "all") {
        amount = user.wallet;
    } else {
        amount = parseInt(args[0]);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
        return message.reply("❌ La cantidad no es válida.");
    }

    if (amount > user.wallet) {
        return message.reply(
            "❌ No tienes suficientes monedas."
        );
    }

    user.wallet -= amount;
    user.bank += amount;

    saveDatabase();

    return message.reply(
        `🏦 Depositaste **${money(amount)}**.\n` +
        `💵 Cartera: **${money(user.wallet)}**\n` +
        `🏦 Banco: **${money(user.bank)}**`
    );
}

// ============================================================
// 💰 BALANCE
// ============================================================

function commandBalance(message) {

    const user = getUser(message.author.id);

    return message.reply(
        [
            `💰 **Economía de ${message.author.username}**`,
            "",
            `💵 Cartera: **${money(user.wallet)}**`,
            `🏦 Banco: **${money(user.bank)}**`,
            `💎 Total: **${money(user.wallet + user.bank)}**`
        ].join("\n")
    );
}

// ============================================================
// 🥷 ROB
// ============================================================

async function commandRob(message, target) {

    if (!target) {
        return message.reply(
            "❌ Usa `S.rob @usuario`."
        );
    }

    if (target.id === message.author.id) {
        return message.reply(
            "❌ No puedes robarte a ti mismo."
        );
    }

    if (target.bot) {
        return message.reply(
            "❌ No puedes robar a un bot."
        );
    }

    const robber = getUser(message.author.id);
    const victim = getUser(target.id);

    const cooldown = 5 * 60 * 1000;

    const remaining =
        cooldownRemaining(
            robber.lastRob,
            cooldown
        );

    if (remaining) {
        return message.reply(
            `⏳ Espera **${formatTime(remaining)}** para volver a robar.`
        );
    }

    robber.lastRob = Date.now();

    if (victim.wallet <= 0) {
        saveDatabase();

        return message.reply(
            "❌ Ese usuario no tiene monedas en su cartera."
        );
    }

    if (chance(30)) {

        const maxRob =
            Math.min(300, victim.wallet);

        const amount =
            random(1, maxRob);

        victim.wallet -= amount;
        robber.wallet += amount;

        saveDatabase();

        return message.reply(
            `🥷 ¡Robo exitoso!\n` +
            `💰 Robaste **${money(amount)}** a ${target}.`
        );
    }

    saveDatabase();

    return message.reply(
        `🚨 Te atraparon intentando robar a ${target}.`
    );
}

// ============================================================
// 🪙 COINFLIP
// ============================================================

async function commandCoinflip(message, args) {

    const user = getUser(message.author.id);

    const cooldown = 30 * 1000;

    const remaining =
        cooldownRemaining(
            user.lastCoinflip,
            cooldown
        );

    if (remaining) {
        return message.reply(
            `⏳ Espera **${formatTime(remaining)}**.`
        );
    }

    if (!args[0]) {
        return message.reply(
            "❌ Usa `S.coinflip <cantidad>`."
        );
    }

    let amount =
        args[0].toLowerCase() === "all"
            ? user.wallet
            : parseInt(args[0]);

    if (!Number.isInteger(amount) || amount <= 0) {
        return message.reply(
            "❌ Cantidad inválida."
        );
    }

    if (amount > user.wallet) {
        return message.reply(
            "❌ No tienes suficientes monedas."
        );
    }

    user.lastCoinflip = Date.now();

    if (chance(50)) {
        user.wallet += amount;

        saveDatabase();

        return message.reply(
            `🪙 **Cara**\n🎉 Ganaste **${money(amount)}**.`
        );
    }

    user.wallet -= amount;

    saveDatabase();

    return message.reply(
        `🪙 **Cruz**\n❌ Perdiste **${money(amount)}**.`
    );
}

// ============================================================
// 🎲 DICE
// ============================================================

async function commandDice(message, args) {

    const user = getUser(message.author.id);

    const cooldown = 45 * 1000;

    const remaining =
        cooldownRemaining(
            user.lastDice,
            cooldown
        );

    if (remaining) {
        return message.reply(
            `⏳ Espera **${formatTime(remaining)}**.`
        );
    }

    if (!args[0]) {
        return message.reply(
            "❌ Usa `S.dice <cantidad>`."
        );
    }

    let amount =
        args[0].toLowerCase() === "all"
            ? user.wallet
            : parseInt(args[0]);

    if (!Number.isInteger(amount) || amount <= 0) {
        return message.reply(
            "❌ Cantidad inválida."
        );
    }

    if (amount > user.wallet) {
        return message.reply(
            "❌ No tienes suficientes monedas."
        );
    }

    user.lastDice = Date.now();

    const roll = random(1, 6);

    if (roll >= 4) {

        user.wallet += amount;

        saveDatabase();

        return message.reply(
            `🎲 Sacaste **${roll}**.\n` +
            `🎉 Ganaste **${money(amount)}**.`
        );
    }

    user.wallet -= amount;

    saveDatabase();

    return message.reply(
        `🎲 Sacaste **${roll}**.\n` +
        `❌ Perdiste **${money(amount)}**.`
    );
}

// ============================================================
// 🃏 BLACKJACK
// ============================================================

function cardValue(card) {
    if (card === "A") return 11;
    if (["K", "Q", "J"].includes(card)) return 10;
    return parseInt(card);
}

function calculateHand(hand) {

    let total = 0;
    let aces = 0;

    for (const card of hand) {

        total += cardValue(card);

        if (card === "A") {
            aces++;
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

function randomCard() {

    const cards = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K"
    ];

    return cards[random(0, cards.length - 1)];
}

const blackjackGames = new Map();

async function commandBlackjack(message, args) {

    const user = getUser(message.author.id);

    if (!args[0]) {
        return message.reply(
            "❌ Usa `S.bj <cantidad>` o `S.bj all`."
        );
    }

    if (blackjackGames.has(message.author.id)) {
        return message.reply(
            "🃏 Ya tienes una partida de blackjack activa."
        );
    }

    let amount =
        args[0].toLowerCase() === "all"
            ? user.wallet
            : parseInt(args[0]);

    if (!Number.isInteger(amount) || amount <= 0) {
        return message.reply(
            "❌ Cantidad inválida."
        );
    }

    if (amount > user.wallet) {
        return message.reply(
            "❌ No tienes suficientes monedas."
        );
    }

    if (user.wallet <= 0) {
        return message.reply(
            "❌ No tienes monedas para jugar."
        );
    }

    user.wallet -= amount;

    const player = [
        randomCard(),
        randomCard()
    ];

    const dealer = [
        randomCard(),
        randomCard()
    ];

    blackjackGames.set(message.author.id, {
        amount,
        player,
        dealer,
        messageId: null
    });

    saveDatabase();

    const game = blackjackGames.get(message.author.id);

    const embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack")
        .setDescription(
            [
                `💰 Apuesta: **${money(amount)}**`,
                "",
                `👤 **Tus cartas:** ${player.join(" | ")}`,
                `🔢 Total: **${calculateHand(player)}**`,
                "",
                `🤖 **Carta visible del dealer:** ${dealer[0]}`,
                "",
                "Elige una acción:"
            ].join("\n")
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`bj_hit_${message.author.id}`)
                .setLabel("Hit")
                .setEmoji("🃏")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`bj_stand_${message.author.id}`)
                .setLabel("Stand")
                .setEmoji("✋")
                .setStyle(ButtonStyle.Secondary)
        );

    const sent = await message.reply({
        embeds: [embed],
        components: [row]
    });

    game.messageId = sent.id;
}

// ============================================================
// 🃏 RESOLVER BLACKJACK
// ============================================================

async function finishBlackjack(interaction, won, draw = false) {

    const game =
        blackjackGames.get(interaction.user.id);

    if (!game) {
        return interaction.reply({
            content: "❌ Esta partida ya terminó.",
            ephemeral: true
        });
    }

    const user = getUser(interaction.user.id);

    blackjackGames.delete(interaction.user.id);

    if (draw) {
        user.wallet += game.amount;
    } else if (won) {
        user.wallet += game.amount * 2;
    }

    saveDatabase();

    let result;

    if (draw) {
        result =
            `🤝 Empate.\nRecuperas **${money(game.amount)}**.`;
    } else if (won) {
        result =
            `🎉 ¡Ganaste!\nRecibes **${money(game.amount * 2)}**.`;
    } else {
        result =
            `❌ Perdiste **${money(game.amount)}**.`;
    }

    const embed = new EmbedBuilder()
        .setTitle("🃏 Blackjack | Resultado")
        .setDescription(
            [
                `👤 Tus cartas: ${game.player.join(" | ")}`,
                `🔢 Tu total: **${calculateHand(game.player)}**`,
                "",
                `🤖 Dealer: ${game.dealer.join(" | ")}`,
                `🔢 Total dealer: **${calculateHand(game.dealer)}**`,
                "",
                result
            ].join("\n")
        );

    return interaction.update({
        embeds: [embed],
        components: []
    });
}

// ============================================================
// 🃏 BOTONES BLACKJACK
// ============================================================

async function handleBlackjackButton(interaction) {

    const [prefix, action, userId] =
        interaction.customId.split("_");

    if (prefix !== "bj") return;

    if (interaction.user.id !== userId) {
        return interaction.reply({
            content:
                "❌ Esta partida no es tuya.",
            ephemeral: true
        });
    }

    const game =
        blackjackGames.get(interaction.user.id);

    if (!game) {
        return interaction.reply({
            content: "❌ Esta partida ya terminó.",
            ephemeral: true
        });
    }

    if (action === "hit") {

        game.player.push(randomCard());

        const total =
            calculateHand(game.player);

        if (total > 21) {

            const user =
                getUser(interaction.user.id);

            blackjackGames.delete(interaction.user.id);

            saveDatabase();

            const embed =
                new EmbedBuilder()
                    .setTitle("🃏 Blackjack")
                    .setDescription(
                        [
                            `Tus cartas: ${game.player.join(" | ")}`,
                            `Total: **${total}**`,
                            "",
                            "💥 Te pasaste de 21.",
                            `❌ Perdiste **${money(game.amount)}**.`
                        ].join("\n")
                    );

            return interaction.update({
                embeds: [embed],
                components: []
            });
        }

        const embed =
            new EmbedBuilder()
                .setTitle("🃏 Blackjack")
                .setDescription(
                    [
                        `💰 Apuesta: **${money(game.amount)}**`,
                        "",
                        `👤 **Tus cartas:** ${game.player.join(" | ")}`,
                        `🔢 Total: **${total}**`,
                        "",
                        `🤖 **Carta visible del dealer:** ${game.dealer[0]}`,
                        "",
                        "Elige una acción:"
                    ].join("\n")
                );

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`bj_hit_${interaction.user.id}`)
                        .setLabel("Hit")
                        .setEmoji("🃏")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId(`bj_stand_${interaction.user.id}`)
                        .setLabel("Stand")
                        .setEmoji("✋")
                        .setStyle(ButtonStyle.Secondary)
                );

        return interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    if (action === "stand") {

        while (
            calculateHand(game.dealer) < 17
        ) {
            game.dealer.push(randomCard());
        }

        const playerTotal =
            calculateHand(game.player);

        const dealerTotal =
            calculateHand(game.dealer);

        if (dealerTotal > 21) {
            return finishBlackjack(
                interaction,
                true
            );
        }

        if (playerTotal > dealerTotal) {
            return finishBlackjack(
                interaction,
                true
            );
        }

        if (playerTotal === dealerTotal) {
            return finishBlackjack(
                interaction,
                false,
                true
            );
        }

        return finishBlackjack(
            interaction,
            false
        );
    }
}

// ============================================================
// 🧩 INTERACCIONES
// ============================================================

client.on("interactionCreate", async interaction => {

    try {

        // ----------------------------------------------------
        // SELECT MENUS
        // ----------------------------------------------------

        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === "help_menu") {

                const selected =
                    interaction.values[0];

                if (selected === "info") {

                    return interaction.update({
                        embeds: [infoEmbed()],
                        components: [interaction.message.components[0]]
                    });
                }

                if (selected === "economy") {

                    return interaction.update({
                        embeds: [economyEmbed()],
                        components: [interaction.message.components[0]]
                    });
                }
            }

            if (interaction.customId === "admin_menu") {

                if (
                    !interaction.member.permissions.has(
                        PermissionsBitField.Flags.Administrator
                    )
                ) {
                    return interaction.reply({
                        content:
                            "❌ Necesitas ser administrador.",
                        ephemeral: true
                    });
                }

                const selected =
                    interaction.values[0];

                if (selected === "config") {

                    return interaction.update({
                        embeds: [configEmbed()],
                        components: [interaction.message.components[0]]
                    });
                }
            }
        }

        // ----------------------------------------------------
        // BOTONES BLACKJACK
        // ----------------------------------------------------

        if (interaction.isButton()) {

            if (
                interaction.customId.startsWith("bj_")
            ) {
                return handleBlackjackButton(
                    interaction
                );
            }
        }

    } catch (error) {

        console.error(
            "❌ Error en interacción:",
            error
        );

        if (!interaction.replied) {
            interaction.reply({
                content:
                    "❌ Ocurrió un error procesando la interacción.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ============================================================
// 💬 COMANDOS
// ============================================================

client.on("messageCreate", async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    if (
        !message.content
            .toLowerCase()
            .startsWith(PREFIX.toLowerCase())
    ) {
        return;
    }

    const args =
        message.content
            .slice(PREFIX.length)
            .trim()
            .split(/\s+/);

    const command =
        (args.shift() || "").toLowerCase();

    // ========================================================
    // 📚 HELP
    // ========================================================

    if (command === "help") {

        return message.reply(
            helpMenu()
        );
    }

    // ========================================================
    // ⚙️ ADMIN
    // ========================================================

    if (command === "admin") {

        if (
            !message.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return message.reply(
                "❌ Solo los administradores pueden utilizar `S.admin`."
            );
        }

        return message.reply(
            adminMenu()
        );
    }

    // ========================================================
    // 👋 BIENVENIDAS
    // ========================================================

    if (command === "bienvenidas") {

        if (
            !message.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return message.reply(
                "❌ Solo los administradores pueden utilizar este comando."
            );
        }

        const channel =
            message.mentions.channels.first();

        if (!channel) {
            return message.reply(
                "❌ Usa `S.bienvenidas #canal`."
            );
        }

        if (channel.type !== ChannelType.GuildText) {
            return message.reply(
                "❌ Debes seleccionar un canal de texto."
            );
        }

        const config =
            getGuild(message.guild.id);

        config.welcomeChannel =
            channel.id;

        saveDatabase();

        return message.reply(
            `✅ Las bienvenidas se enviarán en ${channel}.`
        );
    }

    // ========================================================
    // 📩 INVITES
    // ========================================================

    if (command === "invites") {

        if (
            !message.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return message.reply(
                "❌ Solo los administradores pueden utilizar este comando."
            );
        }

        const channel =
            message.mentions.channels.first();

        if (!channel) {
            return message.reply(
                "❌ Usa `S.invites #canal`."
            );
        }

        if (channel.type !== ChannelType.GuildText) {
            return message.reply(
                "❌ Debes seleccionar un canal de texto."
            );
        }

        const config =
            getGuild(message.guild.id);

        config.inviteChannel =
            channel.id;

        saveDatabase();

        return message.reply(
            `✅ Los mensajes de invitaciones se enviarán en ${channel}.`
        );
    }

    // ========================================================
    // 💰 BALANCE
    // ========================================================

    if (
        command === "balance" ||
        command === "bal"
    ) {
        return commandBalance(message);
    }

    // ========================================================
    // 💼 WORK
    // ========================================================

    if (command === "work") {
        return commandWork(message);
    }

    // ========================================================
    // 🎲 SLUT
    // ========================================================

    if (command === "slut") {
        return commandSlut(message);
    }

    // ========================================================
    // 🔫 CRIME
    // ========================================================

    if (command === "crime") {
        return commandCrime(message);
    }

    // ========================================================
    // 🎁 DAILY
    // ========================================================

    if (command === "daily") {
        return commandDaily(message);
    }

    // ========================================================
    // 🏦 DEP
    // ========================================================

    if (
        command === "dep" ||
        command === "deposit"
    ) {
        return commandDeposit(
            message,
            args
        );
    }

    // ========================================================
    // 🃏 BLACKJACK
    // ========================================================

    if (command === "bj") {
        return commandBlackjack(
            message,
            args
        );
    }

    // ========================================================
    // 🥷 ROB
    // ========================================================

    if (command === "rob") {

        const target =
            message.mentions.users.first();

        return commandRob(
            message,
            target
        );
    }

    // ========================================================
    // 🪙 COINFLIP
    // ========================================================

    if (command === "coinflip") {
        return commandCoinflip(
            message,
            args
        );
    }

    // ========================================================
    // 🎲 DICE
    // ========================================================

    if (command === "dice") {
        return commandDice(
            message,
            args
        );
    }

    // ========================================================
    // 🤖 INFO BOT
    // ========================================================

    if (
        command === "infobot"
    ) {

        return message.reply({
            embeds: [
                botInfo(message)
            ]
        });
    }

    // ========================================================
    // 🏠 INFO SERVER
    // ========================================================

    if (
        command === "infoserver"
    ) {

        return message.reply({
            embeds: [
                serverInfo(
                    message.guild
                )
            ]
        });
    }

    // ========================================================
    // 🖼️ INFO ICON
    // ========================================================

    if (
        command === "infoicon"
    ) {

        return message.reply({
            embeds: [
                iconInfo(
                    message.guild
                )
            ]
        });
    }

    // ========================================================
    // 👤 INFO USER
    // ========================================================

    if (
        command === "infouser"
    ) {

        const target =
            message.mentions.users.first() ||
            message.author;

        return message.reply({
            embeds: [
                await userInfo(
                    target
                )
            ]
        });
    }

    // ========================================================
    // 🆘 COMANDO DESCONOCIDO
    // ========================================================

    return message.reply(
        `❌ Comando desconocido. Usa \`${PREFIX}help\` para ver los comandos.`
    );
});

// ============================================================
// 🔴 ERRORES
// ============================================================

process.on("unhandledRejection", error => {
    console.error(
        "❌ Unhandled Rejection:",
        error
    );
});

process.on("uncaughtException", error => {
    console.error(
        "❌ Uncaught Exception:",
        error
    );
});

// ============================================================
// 🔑 LOGIN
// ============================================================

if (!TOKEN) {
    console.error(
        "❌ No se encontró DISCORD_TOKEN en las variables de entorno."
    );
    process.exit(1);
}

client.login(TOKEN);
