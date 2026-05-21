export declare function sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}): Promise<void>;
export declare function sendAdminNotification(options: {
    subject: string;
    text: string;
}): Promise<void>;
//# sourceMappingURL=mailer.d.ts.map