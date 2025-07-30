import { google } from "googleapis";
import { GSheetsUpdateCellInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gsheets_update_cell",
  description: "Update a cell value in a Google Spreadsheet",
  inputSchema: {
    type: "object",
    properties: {
      access_token: {
        type: "string",
        description: "The access token for the API",
      },
      fileId: {
        type: "string",
        description: "ID of the spreadsheet",
      },
      range: {
        type: "string",
        description: "Cell range in A1 notation (e.g. 'Sheet1!A1')",
      },
      value: {
        type: "string",
        description: "New cell value",
      },
    },
    required: ["access_token", "fileId", "range", "value"],
  },
} as const;

export async function updateCell(
  args: GSheetsUpdateCellInput
): Promise<InternalToolResponse> {
  const { fileId, range, value } = args;
  let oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: args.access_token });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  await sheets.spreadsheets.values.update({
    spreadsheetId: fileId,
    range: range,
    valueInputOption: "RAW",
    requestBody: {
      values: [[value]],
    },
  });

  return {
    content: [
      {
        type: "text",
        text: `Updated cell ${range} to value: ${value}`,
      },
    ],
    isError: false,
  };
}
