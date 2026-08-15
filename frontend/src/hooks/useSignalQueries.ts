import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, normalizeVoteResult } from '../lib/api'
import type { Post } from '../lib/types'

/** Optimistic upvote toggle for a board's post list. */
export function usePostVote(boardId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['posts', boardId] as const

  return useMutation({
    mutationFn: api.vote,
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Post[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Post[]>(
          queryKey,
          previous.map((post) => {
            if (post.id !== postId) return post
            const voteCount = post.voteCount + (post.viewerVoted ? -1 : 1)
            return { ...post, voteCount, viewerVoted: !post.viewerVoted }
          }),
        )
      }
      return { previous }
    },
    onSuccess: (raw, postId) => {
      // Reconcile the optimistic value with the server's actual response.
      const current = queryClient.getQueryData<Post[]>(queryKey)
      if (!current) return
      queryClient.setQueryData<Post[]>(
        queryKey,
        current.map((post) => {
          if (post.id !== postId) return post
          const result = normalizeVoteResult(raw, { voteCount: post.voteCount, voted: post.viewerVoted })
          return { ...post, voteCount: result.voteCount, viewerVoted: result.voted }
        }),
      )
    },
    onError: (_error, _postId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: api.listWorkspaces,
    select: (workspaces) => workspaces.find((workspace) => workspace.id === workspaceId),
  })
}

export function useBoard(workspaceId: string, boardId: string) {
  return useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => api.listBoards(workspaceId),
    select: (boards) => boards.find((board) => board.id === boardId),
  })
}
