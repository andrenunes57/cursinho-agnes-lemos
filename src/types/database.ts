
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "arquivos": {
                  Row: {
                    "conta_armazenamento": string,"criado_em": string,"drive_file_id": string,"enviado_por": string | null,"finalidade": Database["public"]['Enums']["finalidade_arquivo"],"id": string,"mime_type": string,"nome": string,"tamanho_bytes": number,"url_visualizacao": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conta_armazenamento": string,"criado_em"?: string,"drive_file_id": string,"enviado_por"?: string | null,"finalidade": Database["public"]['Enums']["finalidade_arquivo"],"id"?: string,"mime_type": string,"nome": string,"tamanho_bytes": number,"url_visualizacao": string
                  }
                  Update: {
                    "conta_armazenamento"?: string,"criado_em"?: string,"drive_file_id"?: string,"enviado_por"?: string | null,"finalidade"?: Database["public"]['Enums']["finalidade_arquivo"],"id"?: string,"mime_type"?: string,"nome"?: string,"tamanho_bytes"?: number,"url_visualizacao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "arquivos_enviado_por_fkey"
      columns: ["enviado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"aulas": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"data": string,"disciplina_id": string,"id": string,"inicio": string | null,"professor_id": string,"titulo": string,"turma_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data": string,"disciplina_id": string,"id"?: string,"inicio"?: string | null,"professor_id": string,"titulo": string,"turma_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"data"?: string,"disciplina_id"?: string,"id"?: string,"inicio"?: string | null,"professor_id"?: string,"titulo"?: string,"turma_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "aulas_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aulas_disciplina_id_fkey"
      columns: ["disciplina_id"]
isOneToOne: false
      referencedRelation: "disciplinas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aulas_professor_id_fkey"
      columns: ["professor_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aulas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "turmas"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracoes": {
                  Row: {
                    "atualizado_em": string,"chave": string,"valor": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"chave": string,"valor": NonNullable<Json>
                  }
                  Update: {
                    "atualizado_em"?: string,"chave"?: string,"valor"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"disciplinas": {
                  Row: {
                    "ativa": boolean,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"id"?: string,"nome": string
                  }
                  Update: {
                    "ativa"?: boolean,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entregas": {
                  Row: {
                    "arquivo_id": string | null,"avaliada_em": string | null,"avaliada_por": string | null,"comentario": string | null,"conceito": string | null,"devolutiva": string | null,"enviada_em": string,"estudante_id": string,"id": string,"link": string | null,"nota": number | null,"tarefa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_id"?: string | null,"avaliada_em"?: string | null,"avaliada_por"?: string | null,"comentario"?: string | null,"conceito"?: string | null,"devolutiva"?: string | null,"enviada_em"?: string,"estudante_id": string,"id"?: string,"link"?: string | null,"nota"?: number | null,"tarefa_id": string
                  }
                  Update: {
                    "arquivo_id"?: string | null,"avaliada_em"?: string | null,"avaliada_por"?: string | null,"comentario"?: string | null,"conceito"?: string | null,"devolutiva"?: string | null,"enviada_em"?: string,"estudante_id"?: string,"id"?: string,"link"?: string | null,"nota"?: number | null,"tarefa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entregas_arquivo_id_fkey"
      columns: ["arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_avaliada_por_fkey"
      columns: ["avaliada_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_estudante_id_fkey"
      columns: ["estudante_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entregas_tarefa_id_fkey"
      columns: ["tarefa_id"]
isOneToOne: false
      referencedRelation: "tarefas"
      referencedColumns: ["id"]
    }
                  ]
                },"materiais": {
                  Row: {
                    "arquivo_id": string | null,"atualizado_em": string,"aula_id": string,"conteudo": string | null,"criado_em": string,"criado_por": string | null,"id": string,"ordem": number,"publicado": boolean,"tipo": Database["public"]['Enums']["tipo_material"],"titulo": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"aula_id": string,"conteudo"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"ordem"?: number,"publicado"?: boolean,"tipo": Database["public"]['Enums']["tipo_material"],"titulo": string,"url"?: string | null
                  }
                  Update: {
                    "arquivo_id"?: string | null,"atualizado_em"?: string,"aula_id"?: string,"conteudo"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"ordem"?: number,"publicado"?: boolean,"tipo"?: Database["public"]['Enums']["tipo_material"],"titulo"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "materiais_arquivo_id_fkey"
      columns: ["arquivo_id"]
isOneToOne: false
      referencedRelation: "arquivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materiais_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materiais_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"matriculas": {
                  Row: {
                    "criado_em": string,"estudante_id": string,"turma_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"estudante_id": string,"turma_id": string
                  }
                  Update: {
                    "criado_em"?: string,"estudante_id"?: string,"turma_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matriculas_estudante_id_fkey"
      columns: ["estudante_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matriculas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "turmas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "atualizado_em": string,"consentimento_em": string | null,"criado_em": string,"email": string,"id": string,"nome_social": string | null,"papel": Database["public"]['Enums']["papel_usuario"],"pronomes": string | null,"status": Database["public"]['Enums']["status_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"consentimento_em"?: string | null,"criado_em"?: string,"email": string,"id": string,"nome_social"?: string | null,"papel"?: Database["public"]['Enums']["papel_usuario"],"pronomes"?: string | null,"status"?: Database["public"]['Enums']["status_usuario"]
                  }
                  Update: {
                    "atualizado_em"?: string,"consentimento_em"?: string | null,"criado_em"?: string,"email"?: string,"id"?: string,"nome_social"?: string | null,"papel"?: Database["public"]['Enums']["papel_usuario"],"pronomes"?: string | null,"status"?: Database["public"]['Enums']["status_usuario"]
                  }
                  Relationships: [
                    
                  ]
                },"presencas": {
                  Row: {
                    "aula_id": string,"estudante_id": string,"registrado_em": string,"registrado_por": string,"status": Database["public"]['Enums']["status_presenca"]
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id": string,"estudante_id": string,"registrado_em"?: string,"registrado_por": string,"status": Database["public"]['Enums']["status_presenca"]
                  }
                  Update: {
                    "aula_id"?: string,"estudante_id"?: string,"registrado_em"?: string,"registrado_por"?: string,"status"?: Database["public"]['Enums']["status_presenca"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "presencas_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "presencas_estudante_id_fkey"
      columns: ["estudante_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"tarefas": {
                  Row: {
                    "atualizado_em": string,"aula_id": string,"criado_em": string,"criado_por": string | null,"id": string,"instrucoes": string | null,"opcoes_conceito": (string)[] | null,"prazo": string | null,"publicada": boolean,"tipo_avaliacao": Database["public"]['Enums']["tipo_avaliacao"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"aula_id": string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"instrucoes"?: string | null,"opcoes_conceito"?: (string)[] | null,"prazo"?: string | null,"publicada"?: boolean,"tipo_avaliacao"?: Database["public"]['Enums']["tipo_avaliacao"],"titulo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"aula_id"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"instrucoes"?: string | null,"opcoes_conceito"?: (string)[] | null,"prazo"?: string | null,"publicada"?: boolean,"tipo_avaliacao"?: Database["public"]['Enums']["tipo_avaliacao"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tarefas_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tarefas_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"turmas": {
                  Row: {
                    "ano": number,"ativa": boolean,"criado_em": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ano": number,"ativa"?: boolean,"criado_em"?: string,"id"?: string,"nome": string
                  }
                  Update: {
                    "ano"?: number,"ativa"?: boolean,"criado_em"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aprovar_cadastros":
{ Args: { "p_ids": (string)[],"p_papel"?: Database["public"]['Enums']["papel_usuario"],"p_turma_id"?: string }; Returns: number
                           },
"avaliar_entrega":
{ Args: { "p_conceito"?: string,"p_devolutiva"?: string,"p_entrega_id": string,"p_nota"?: number }; Returns: {
              "arquivo_id": string | null,
"avaliada_em": string | null,
"avaliada_por": string | null,
"comentario": string | null,
"conceito": string | null,
"devolutiva": string | null,
"enviada_em": string,
"estudante_id": string,
"id": string,
"link": string | null,
"nota": number | null,
"tarefa_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "entregas"
        isOneToOne: true
        isSetofReturn: false
      } },
"definir_papel":
{ Args: { "p_id": string,"p_papel": Database["public"]['Enums']["papel_usuario"] }; Returns: undefined
                           },
"definir_status":
{ Args: { "p_id": string,"p_status": Database["public"]['Enums']["status_usuario"] }; Returns: undefined
                           },
"enviar_entrega":
{ Args: { "p_arquivo_id"?: string,"p_comentario"?: string,"p_link"?: string,"p_tarefa_id": string }; Returns: {
              "arquivo_id": string | null,
"avaliada_em": string | null,
"avaliada_por": string | null,
"comentario": string | null,
"conceito": string | null,
"devolutiva": string | null,
"enviada_em": string,
"estudante_id": string,
"id": string,
"link": string | null,
"nota": number | null,
"tarefa_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "entregas"
        isOneToOne: true
        isSetofReturn: false
      } },
"equipe":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"nome_social": string,"papel": Database["public"]['Enums']["papel_usuario"],"pronomes": string
            }[]
                           },
"estudantes_da_turma":
{ Args: { "p_turma_id": string }; Returns: {
              "id": string,"nome_social": string,"pronomes": string
            }[]
                           },
"frequencia":
{ Args: { "p_ate"?: string,"p_de"?: string,"p_turma_id": string }; Returns: {
              "aulas_com_chamada": number,"ausentes": number,"estudante_id": string,"justificadas": number,"nome_social": string,"percentual": number,"presentes": number
            }[]
                           },
"ping":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"registrar_chamada":
{ Args: { "p_aula_id": string,"p_itens": Json }; Returns: number
                           }
          }
          Enums: {
            "finalidade_arquivo": "material"|"entrega","papel_usuario": "estudante"|"professor"|"coordenacao","status_presenca": "presente"|"ausente"|"justificada","status_usuario": "pendente"|"ativo"|"inativo","tipo_avaliacao": "nota"|"conceito"|"devolutiva","tipo_material": "arquivo"|"link"|"video"|"texto"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "finalidade_arquivo": ["material", "entrega"],"papel_usuario": ["estudante", "professor", "coordenacao"],"status_presenca": ["presente", "ausente", "justificada"],"status_usuario": ["pendente", "ativo", "inativo"],"tipo_avaliacao": ["nota", "conceito", "devolutiva"],"tipo_material": ["arquivo", "link", "video", "texto"]
          }
        }
} as const
