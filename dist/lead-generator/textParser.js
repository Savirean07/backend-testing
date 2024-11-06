"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformData = void 0;
const getLeadInformation = (text) => {
    const pattern = /Email': '([^']*)', 'Name': '([^']*)', 'Position': '([^']*)', 'LinkedIn URL': '([^']*)', 'EMAIL STATUS': '([^']*)/;
    const match = text.match(pattern);
    if (match) {
        const result = {
            Email: match[1],
            Name: match[2],
            Position: match[3],
            LinkedInURL: match[4],
            EmailStatus: match[5]
        };
        // Create a Markdown formatted string
        const markdownString = `## Lead Information

- **Email:** ${result.Email}
- **Name:** ${result.Name}
- **Position:** ${result.Position}
- **LinkedIn URL:** [Profile](${result.LinkedInURL})
- **Email Status:** ${result.EmailStatus}
    `;
        return markdownString;
    }
    else {
        return null;
    }
};
class TransformData {
    constructor() {
        this.agentData = {};
        this.isSectionEnded = false;
        this.ignoreContent = false;
        this.startPushContent = false;
        this.regexExpression = {
            ERROR: /^ERROR:/i,
            FEEDBACK: /Please give feedback to/i,
            AGENT: /\(to [a-zA-Z_]+\):/,
            NEXT_SPEAKER: /^next speaker: /i,
            IGNORE_TERMINATE: /\*\*TERMINATE\*\*/,
            STAR_WITH_CHAR_CONTENT: /\*{4,} Response from calling function .*? \*{4,}/,
            ONLY_STAR_CONTENT: /^\*{4,}$/,
        };
    }
    readTempData(dataBlock, options) {
        const { callback, regex, duration } = options;
        const data = dataBlock.toString().split(regex || /-------------break-------------/);
        const timer = setInterval(() => {
            if (data.length > 0) {
                callback({ data: data.shift().trim(), ended: false });
            }
            else {
                clearInterval(timer);
                callback({ data: null, ended: true });
            }
        }, duration || 500);
    }
    transformData(rawData, counter) {
        const { AGENT, FEEDBACK, ONLY_STAR_CONTENT, STAR_WITH_CHAR_CONTENT, NEXT_SPEAKER, ERROR, IGNORE_TERMINATE } = this.regexExpression;
        this.startPushContent = false;
        this.agentData = {};
        if (!rawData)
            return this.agentData;
        const lines = rawData.split(/\n/);
        for (const line of lines) {
            if (ERROR.test(line) || IGNORE_TERMINATE.test(line) || /^None$/i.test(line)) {
                continue;
            }
            if (FEEDBACK.test(line)) {
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "prompt", requested_to: "admin", status: "waiting", content: line });
            }
            // Here we are going to check agents line and push the agent to the agentData.agent
            if (AGENT.test(line)) {
                let [agent, report] = line
                    .replace(/\):/, "")
                    .split(/\(to/)
                    .map((item) => item.trim());
                this.agentData = Object.assign(Object.assign({}, this.agentData), { agent, report_to: report });
                continue;
            }
            // Here we are going to check next speaker line and push the next speaker to the agentData.next_speaker
            if (NEXT_SPEAKER.test(line)) {
                this.agentData = Object.assign(Object.assign({}, this.agentData), { next_speaker: line.replace(NEXT_SPEAKER, "").trim() });
                continue;
            }
            if (/^TERMINATE/i.test(line) && this.agentData.agent === "writing_assistant" && this.agentData.report_to === "User_proxy") {
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "terminated", requested_to: "bot", status: "completed", content: line });
                continue;
            }
            if (/### Research Report/i.test(line)) {
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "research_report", requested_to: "bot", status: "in_progress", content: line });
                continue;
            }
            if (/{'searchParameters':/i.test(line)) {
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "search_parameters", content: line });
                continue;
            }
            if (STAR_WITH_CHAR_CONTENT.test(line)) {
                this.startPushContent = true;
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "report", requested_to: "bot", status: "in_progress" });
                continue;
            }
            if (/subject: /i.test(line)) {
                this.startPushContent = true;
                const isFinalEmail = /user_proxy/i.test(this.agentData.agent) && /writing_assistant/i.test(this.agentData.report_to);
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: isFinalEmail ? "final_email" : "email", requested_to: "bot", status: isFinalEmail ? "completed" : "in_progress", content: line });
                continue;
            }
            if (/subject: /i.test(line)) {
                this.startPushContent = true;
            }
            if (/^Research this lead's website/i.test(line) && this.agentData.agent === "User_proxy" && this.agentData.report_to === "Outbound_researcher") {
                const leadInformation = getLeadInformation(line);
                if (!leadInformation) {
                    this.startPushContent = true;
                }
                this.agentData = Object.assign(Object.assign({}, this.agentData), { response_type: "prompt", requested_to: "bot", status: "in_progress", content: leadInformation || "" });
            }
            // Here we are going to check content lines and push the content to the agentData.content
            let content = this.agentData.content || "";
            if (/terminate/i.test(line)) {
                this.startPushContent = false;
            }
            if (ONLY_STAR_CONTENT.test(line)) {
                this.startPushContent = false;
                continue;
            }
            if (this.startPushContent) {
                content += line + "\n";
            }
            this.agentData.content = content;
        }
        const data = {
            agent: null,
            report_to: null,
            next_speaker: null,
            requested_to: "bot",
            content: null,
            response_type: "unknown",
            status: "in_progress"
        };
        const refinedData = Object.assign(Object.assign({}, data), this.agentData);
        // if (!refinedData.content) return null;
        return refinedData;
    }
    parseJSON(text) {
        text = text
            .replace(text, "\n```json\n" + text + "\n```\n")
            .replace(/{/g, "{\n")
            .replace(/}/g, "\n}")
            .replace(/\[/g, "[\n")
            .replace(/\]/g, "]\n");
        if (/',/g.test(text)) {
            text = text.replace(/',/g, "',\n");
        }
        if (/",/g.test(text)) {
            text = text.replace(/",/g, '",\n');
        }
        if (/},/g.test(text)) {
            text = text.replace(/},/g, "},\n");
        }
        if (/],/g.test(text)) {
            text = text.replace(/],/g, "],\n");
        }
        return text;
    }
}
exports.TransformData = TransformData;
