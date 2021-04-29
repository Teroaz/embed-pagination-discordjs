import {
    DMChannel,
    GuildChannel,
    Message,
    MessageEmbed,
    MessageReaction,
    ReactionCollector,
    TextChannel,
    User
} from "discord.js";

export default class PaginationEmbed {
    private collector: ReactionCollector
    private readonly embeds: Array<MessageEmbed>
    private emojis: Array<string>

    private allowedUsers: Array<User> = []
    private readonly timeout: number

    private currPage: number = 0

    /**
     *
     * @param embeds Embeds to paginate
     * @param emojis Emojis to navigate through the pagination (default : "⬅", "➡")
     * @param timeout Timeout in milliseconds to act on reaction (default : 15 minutes)
     */
    constructor(embeds: Array<MessageEmbed>, emojis?: Array<string>, timeout?: number) {
        this.embeds = embeds
        this.emojis = emojis || ["⬅", "➡"]
        this.timeout = timeout || 15 * 60_000
    }

    sendPagination = async (channel: TextChannel | GuildChannel | DMChannel): Promise<Message> => {

        const message = await (channel as TextChannel).send(this.embeds[this.currPage])

        const filter = ({emoji}: MessageReaction, user: User) => !user.bot && this.emojis.includes(emoji.id || emoji.name)
        this.collector = message.createReactionCollector(filter, {time: this.timeout})

        const emojis = [...new Set(this.emojis)]
        if (emojis.length !== 2) this.emojis = ["⬅", "➡"]
        for (const em of this.emojis) await message.react(em)

        this.collector.on("collect", ((reaction, user) => {

            reaction.users.remove(user.id)

            if (!this.allowedUsers.some(({id}) => id === user.id)) return

            let oldPage = this.currPage

            if (reaction.emoji?.id ?? reaction.emoji.name === this.emojis[0]) {
                if (this.currPage > 0) --this.currPage
            } else {
                if (this.currPage + 1 < this.embeds.length) ++this.currPage
            }

            if (this.currPage !== oldPage) message.edit(this.embeds[this.currPage])
        }))

        this.collector.on("end", () => {
                if (!message.deleted) message.reactions.removeAll()
            }
        )

        return message
    }

    hasAllowedUser = (user: User): boolean => this.allowedUsers.some(it => it.id === user.id)

    addAllowedUser = (user: User | User[]): PaginationEmbed => {

        const users = user instanceof User ? [user] : user
        for (const user of users) {
            if (!this.hasAllowedUser(user)) this.allowedUsers.push(user)
        }

        return this
    }

    removeAllowedUser = (user: User | User[]): PaginationEmbed => {

        const users = user instanceof User ? [user] : user
        for (const user of users) {
            this.allowedUsers = this.allowedUsers.filter(it => it.id !== user.id)
        }

        return this
    }

    getAllowedUsers = (): Array<User> => this.allowedUsers

    getCollector = (): ReactionCollector => this.collector
}
