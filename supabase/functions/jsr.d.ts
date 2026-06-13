declare module 'jsr:@supabase/supabase-js@2' {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>,
  ): {
    from: (table: string) => any;
    rpc: (fn: string, params?: Record<string, unknown>) => any;
    functions: { invoke: (name: string, opts?: Record<string, unknown>) => any };
    auth: { getUser: () => any; getSession: () => any };
    channel: (name: string) => any;
    removeChannel: (channel: any) => void;
  };
}