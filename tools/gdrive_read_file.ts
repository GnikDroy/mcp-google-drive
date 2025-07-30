import { google } from "googleapis";
import { GDriveReadFileInput, InternalToolResponse } from "./types.js";

export const schema = {
  name: "gdrive_read_file",
  description: "Read contents of a file from Google Drive",
  inputSchema: {
    type: "object",
    properties: {
      access_token: {
        type: "string",
        description: "The access token for the API",
      },
      fileId: {
        type: "string",
        description: "ID of the file to read",
      },
    },
    required: ["access_token", "fileId"],
  },
} as const;

interface FileContent {
  uri?: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

export async function readFile(
  args: GDriveReadFileInput
): Promise<InternalToolResponse> {
  const result = await readGoogleDriveFile(args.fileId, args.access_token);
  return {
    content: [
      {
        type: "text",
        text: `Contents of ${result.name}:\n\n${
          result.contents.text || result.contents.blob
        }`,
      },
    ],
    isError: false,
  };
}

async function readGoogleDriveFile(
  fileId: string,
  access_token: string
): Promise<{ name: string; contents: FileContent }> {
  // First get file metadata to check mime type
  let oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const file = await drive.files.get({
    fileId,
    fields: "mimeType,name",
  });

  // For Google Docs/Sheets/etc we need to export
  if (file.data.mimeType?.startsWith("application/vnd.google-apps")) {
    let exportMimeType: string;
    switch (file.data.mimeType) {
      case "application/vnd.google-apps.document":
        exportMimeType = "text/markdown";
        break;
      case "application/vnd.google-apps.spreadsheet":
        exportMimeType = "text/csv";
        break;
      case "application/vnd.google-apps.presentation":
        exportMimeType = "text/plain";
        break;
      case "application/vnd.google-apps.drawing":
        exportMimeType = "image/png";
        break;
      default:
        exportMimeType = "text/plain";
    }

    const res = await drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: "text" }
    );

    return {
      name: file.data.name || fileId,
      contents: {
        mimeType: exportMimeType,
        text: res.data as string,
      },
    };
  }

  // For regular files download content
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const mimeType = file.data.mimeType || "application/octet-stream";
  const isText =
    mimeType.startsWith("text/") || mimeType === "application/json";
  const content = Buffer.from(res.data as ArrayBuffer);

  return {
    name: file.data.name || fileId,
    contents: {
      mimeType,
      ...(isText
        ? { text: content.toString("utf-8") }
        : { blob: content.toString("base64") }),
    },
  };
}
