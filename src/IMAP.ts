/* Code that talks to an IMAP server to list mailboxes and
messages and to retrieve messages. There will be a Worker class
within this. That is what the rest of our application code will use,
along with some interfaces we’ll need. */

import { ExecFileSyncOptionsWithBufferEncoding } from "child_process";
import { ParsedMail } from "mailparser";
import { simpleParser } from "mailparser";
import { IServerInfo } from "./ServerInfo";
const ImapClient = require("emailjs-imap-client");

export interface ICallOptions {
    mailbox: string,
    id?: number
}

export interface IMessage {
    id: string,
    date: string,
    from: string,
    subject: string,
    body?: string
}

export interface IMailbox { name: string, path: string };

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export class Worker {
    private static serverInfo: IServerInfo;
    constructor(inServerInfo: IServerInfo) {
        Worker.serverInfo = inServerInfo;
    }

    private async connectToServer(): Promise<any> {
        const client: any = new ImapClient.default(
            Worker.serverInfo.imap.host,
            Worker.serverInfo.imap.port,
            { auth : Worker.serverInfo.imap.auth }
        );

        client.logLevel = client.LOG_LEVEL_NONE;
        client.onerror = (inError: Error) => {
            console.log(
                "IMAP.Worker.listMailboxes(): Connection Error",
                inError
            );
        };
        
        await client.connect();
        return client;
    } // End connectToServer()

    public async listMailboxes(): Promise<IMailbox[]> {
        const client: any = await this.connectToServer();
        const mailboxes: any = await client.listMailboxes();
        await client.close();
        const finalMailBoxes: IMailbox[] = [];
        const iterateChildren: Function = (inArray: any[]): void => {
            inArray.forEach((inValue: any) => {
                finalMailBoxes.push({
                    name : inValue.name,
                    path : inValue.path
                });
                // Recursive call to flatten mailbox heirarchies
                iterateChildren(inValue.children);
            }); 
        };

        iterateChildren(mailboxes.children);
        return finalMailBoxes;
    } // End listMailboxes()

    public async listMessages(inCallOptions: ICallOptions): Promise<IMessage[]> {
        const client: any = await this.connectToServer();
        const mailbox: any = await client.SelectMailBox(inCallOptions.mailbox);
        if (mailbox.exists === 0) {
            await client.close();
            return [ ];
        }

        const messages: any[] = await client.listMessages(
            inCallOptions.mailbox, "1:*", [ "uid", "envelope" ]
        );
        await client.close();

        const finalMessages: IMessage[] = [];
        messages.forEach((inValue: any) => {
            finalMessages.push({
                id : inValue.uid,
                date: inValue.envelope.date,
                from: inValue.envelope.from[0].address,
                subject: inValue.envelope.subject
            });
        });

        return finalMessages;
    } // End listMessages()

    public async getMessageBody(inCallOptions: ICallOptions): Promise<string> {
        const client: any = await this.connectToServer();

        const messages: any[] = await client.listMessages(
            inCallOptions.mailbox,
            inCallOptions.id,
            [ "body[]" ],
            { byUid : true }
        );
        const parsed: ParsedMail = await simpleParser(messages[0]["body[]"]);
        await client.close();
        return parsed.text;
    } // End getMessageBody()

    public async deleteMessage(inCallOptions: ICallOptions): Promise<any> {
        const client: any = await this.connectToServer();
        await client.deleteMessages(
            inCallOptions.mailbox,
            inCallOptions.id,
            { byUid : true }
        );
        await client.close();
    } // End deleteMessage
} 