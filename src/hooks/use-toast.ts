
import { useToast as useShadcnToast } from "@/components/ui/toast";

// Re-export the hook for simplicity
export const useToast = useShadcnToast;

// Re-export the toast function as well
export const toast = useShadcnToast().toast;
