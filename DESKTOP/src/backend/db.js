const supabase = require('./supabase');

// Helper functions to convert Supabase responses to match your existing code
const handleSupabaseResponse = (response, operation = 'query') => {
  if (response.error) {
    console.error(`Supabase ${operation} error:`, response.error);
    throw response.error;
  }
  return response;
};

// Convert to pool-like interface for easy migration
const pool = {
  query: async (text, params = []) => {
    try {
      // For SELECT queries
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const response = await supabase
          .from(text.match(/FROM\s+(\w+)/i)?.[1] || 'admins')
          .select('*');
        
        return handleSupabaseResponse(response, 'select');
      }
      
      // For INSERT queries
      if (text.trim().toUpperCase().startsWith('INSERT')) {
        const tableMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
        if (tableMatch) {
          const table = tableMatch[1];
          const valuesMatch = text.match(/VALUES\s*\(([^)]+)\)/i);
          if (valuesMatch) {
            const response = await supabase
              .from(table)
              .insert({/* your data here */})
              .select();
            
            return handleSupabaseResponse(response, 'insert');
          }
        }
      }
      
      // For UPDATE queries
      if (text.trim().toUpperCase().startsWith('UPDATE')) {
        const tableMatch = text.match(/UPDATE\s+(\w+)/i);
        if (tableMatch) {
          const response = await supabase
            .from(tableMatch[1])
            .update({/* your data here */})
            .eq('id', params[params.length - 1]) // Assuming last param is ID
            .select();
          
          return handleSupabaseResponse(response, 'update');
        }
      }
      
      // For DELETE queries
      if (text.trim().toUpperCase().startsWith('DELETE')) {
        const tableMatch = text.match(/FROM\s+(\w+)/i);
        if (tableMatch) {
          const response = await supabase
            .from(tableMatch[1])
            .delete()
            .eq('id', params[0])
            .select();
          
          return handleSupabaseResponse(response, 'delete');
        }
      }
      
      throw new Error(`Unsupported query type: ${text}`);
      
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
};

module.exports = pool;