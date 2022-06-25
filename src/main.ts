/* This will be the main entry point and is where we’ll define
the functions that will constitute the API the server presents to the
client. */

import path from "path";
import express, { Express, NextFunction, Request, Response } from "express";
import { serverInfo } from "./ServerInfo";
import * as IMAP from "./IMAP";
import * as SMTP from "./SMTP";
import * as Contacts from "./Contacts";
import { IContact } from "./Contacts";

// Create express app
const app: Express = express();
// Use middleware to parse incoming request bodies that contain JSON
app.use(express.json());
// Make express act as a basic web server, middleware for serving static resources
// __dirname is a node var that holds the dir name where the current script resides
app.use("/", express.static(path.join(__dirname, "../../client/dist")));

// Custom middleware to prevent CORS rejection during development
app.use(function(inRequest: Request, inResponse: Response, inNext: NextFunction) {
    inResponse.header("Access-Control-Allow-Origin", "*");
    inResponse.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    inResponse.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-type,Accept");
    // Process request as required
    inNext();
});

// REST endpoints:

// List mailboxes - using GET method
app.get("/mailboxes",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
            const mailboxes: IMAP.IMailbox[] = await imapWorker.listMailboxes();
            inResponse.json(mailboxes);
        } catch (inError) {
            inResponse.send("error getting mailboxes");
        }
    }
);

// List messages - using GET method
app.get("/mailboxes/:mailbox",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
            const messages: IMAP.IMessage[] = await imapWorker.listMessages(
                { mailbox : inRequest.params.mailbox }
            );
            inResponse.json(messages);
        } catch (inError) {
            inResponse.send("error getting messages");
        }
    }
);

// Get a message - using GET method
app.get("/messages/:mailbox/:id",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
            const messageBody: string = await imapWorker.getMessageBody(
                { 
                    mailbox: inRequest.params.mailbox, 
                    id : parseInt(inRequest.params.id, 10)
                }
            );
            inResponse.send(messageBody);
        } catch (inError) {
            inResponse.send("error getting message");
        }
    }
);

// Delete a message - using DELETE method
app.delete("/messages/:mailbox/:id",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
            await imapWorker.deleteMessage(
                {
                    mailbox: inRequest.params.mailbox,
                    id: parseInt(inRequest.params.id, 10)
                }
            );
        } catch (inError) {
            inResponse.send("error deleting message");
        }
    }
);

// Send a message - using POST method
app.post("/messages",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const smtpWorker: SMTP.Worker = new SMTP.Worker(serverInfo);
            await smtpWorker.sendMessage(inRequest.body);
            inResponse.send("ok");
        } catch (inError) {
            inResponse.send("error sending message");
        }
    }
);

// List contacts - using GET method
app.get("/contacts",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const contactsWorker: Contacts.Worker = new Contacts.Worker();
            const contacts: IContact[] = await contactsWorker.listContacts();
            inResponse.json(contacts);
        } catch (inError) {
            inResponse.send("error listing contacts");
        }
    }
);

// Add contact - using POST method
app.post("/contacts",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const contactsWorker: Contacts.Worker = new Contacts.Worker();
            const contact: IContact = await contactsWorker.addContact(inRequest.body);
            // Return created contact as it will contain unique ID for later use (eg. deleting)
            inResponse.json(contact);
        } catch (inError) {
            inResponse.send("error adding contact");
        }
    }
);

// Delete contact - using DELETE method
app.delete("/contacts/:id",
    async (inRequest: Request, inResponse: Response) => {
        try {
            const contactsWorker: Contacts.Worker = new Contacts.Worker();
            await contactsWorker.deleteContact(inRequest.params.id);
            inResponse.send("ok");
        } catch (inError) {
            inResponse.send("error deleting contact");
        }
    }
);