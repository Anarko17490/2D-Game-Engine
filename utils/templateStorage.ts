import { CustomTemplate } from "../types";

const STORAGE_KEY = 'gm_custom_templates';

export const getTemplatesFromStorage = (): CustomTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load templates", e);
    return [];
  }
};

export const saveTemplateToStorage = (template: CustomTemplate) => {
  try {
    const templates = getTemplatesFromStorage();
    templates.push(template);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn("Failed to save template", e);
  }
};

export const deleteTemplateFromStorage = (id: string) => {
  try {
    const templates = getTemplatesFromStorage().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn("Failed to delete template", e);
  }
};