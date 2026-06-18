"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { FormBuilderState, FormBuilderAction } from "./types";
import {
  formBuilderReducer,
  initialFormBuilderState,
} from "./form-builder-reducer";

// ─── Context Types ────────────────────────────────────────────────────────

interface FormBuilderContextValue {
  state: FormBuilderState;
  dispatch: React.Dispatch<FormBuilderAction>;
}

// ─── Context ──────────────────────────────────────────────────────────────

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

interface FormBuilderProviderProps {
  children: ReactNode;
}

export function FormBuilderProvider({ children }: FormBuilderProviderProps) {
  const [state, dispatch] = useReducer(
    formBuilderReducer,
    initialFormBuilderState
  );

  return (
    <FormBuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </FormBuilderContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useFormBuilder(): FormBuilderContextValue {
  const context = useContext(FormBuilderContext);
  if (!context) {
    throw new Error(
      "useFormBuilder must be used within a FormBuilderProvider"
    );
  }
  return context;
}
