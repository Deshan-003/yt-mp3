import { AlertCircle } from 'lucide-react';
export function ErrorMessage({ message, id }: { message: string; id?: string }) {
  return message ? <p className="error" id={id} role="alert"><AlertCircle size={14}/>{message}</p> : null;
}
