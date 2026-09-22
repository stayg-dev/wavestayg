import "server-only";
import settings from "../config/website.server.json";

// This module must never be imported by a client component.
export const websiteSettings = settings;
