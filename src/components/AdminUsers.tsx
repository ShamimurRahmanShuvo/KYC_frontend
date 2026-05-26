import { useEffect, useState } from 'react'
import { getAuthHeaders } from '../services/auth'
import { createRole, listAdminUsers, listRoles, updateUserRoles } from '../services/api'
import type { AdminUser, RoleResponse } from '../types/auth'

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [roleSelection, setRoleSelection] = useState<Record<number, string[]>>({})
  const [newRoleName, setNewRoleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)
  const [creatingRole, setCreatingRole] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const [usersData, rolesData] = await Promise.all([
        listAdminUsers(getAuthHeaders()),
        listRoles(getAuthHeaders()),
      ])

      setUsers(usersData)
      const names = Array.from(new Set([...rolesData.map((role) => role.name), 'user', 'admin', 'reviewer']))
      setAvailableRoles(names)

      const selections: Record<number, string[]> = {}
      usersData.forEach((user) => {
        selections[user.id] = user.roles
      })
      setRoleSelection(selections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function handleRoleToggle(userId: number, roleName: string) {
    setRoleSelection((current) => {
      const currentRoles = current[userId] ?? []
      const hasRole = currentRoles.includes(roleName)
      const nextRoles = hasRole
        ? currentRoles.filter((role) => role !== roleName)
        : [...currentRoles, roleName]
      return {
        ...current,
        [userId]: nextRoles,
      }
    })
  }

  async function handleCreateRole() {
    const trimmedRole = newRoleName.trim()
    if (!trimmedRole) {
      setError('Role name cannot be empty')
      return
    }

    setCreatingRole(true)
    setError(null)
    setSuccess(null)

    try {
      const role = await createRole(trimmedRole, getAuthHeaders())
      setAvailableRoles((current) => Array.from(new Set([...current, role.name])))
      setNewRoleName('')
      setSuccess(`Created role: ${role.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setCreatingRole(false)
    }
  }

  async function handleSaveRoles(user: AdminUser) {
    const roles = roleSelection[user.id] ?? user.roles
    if (roles.length === 0) {
      setError('Each user must have at least one role')
      return
    }

    setSavingUserId(user.id)
    setError(null)
    setSuccess(null)

    try {
      const updatedUser = await updateUserRoles(user.id, roles, getAuthHeaders())
      setUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)))
      setRoleSelection((current) => ({
        ...current,
        [updatedUser.id]: updatedUser.roles,
      }))
      setSuccess(`Updated roles for ${updatedUser.username}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update roles')
    } finally {
      setSavingUserId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">User Role Management</h1>
          <p className="text-muted mb-0">Administrators can assign or remove roles for any user, and create new roles.</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={loadUsers}>
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label htmlFor="newRoleName" className="form-label">
                New role name
              </label>
              <input
                id="newRoleName"
                type="text"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                className="form-control"
                placeholder="e.g. reviewer"
              />
            </div>
            <div className="col-md-4 text-end">
              <button
                className="btn btn-primary w-100"
                onClick={handleCreateRole}
                disabled={creatingRole || !newRoleName.trim()}
              >
                {creatingRole ? 'Creating role…' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Current Roles</th>
              <th>Role Assignment</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const selectedRoles = roleSelection[user.id] ?? user.roles
              return (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email || '—'}</td>
                  <td>{user.roles.join(', ') || 'none'}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      {availableRoles.map((roleName) => (
                        <label key={`${user.id}-${roleName}`} className="form-check form-check-inline">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedRoles.includes(roleName)}
                            onChange={() => handleRoleToggle(user.id, roleName)}
                          />
                          <span className="form-check-label">{roleName}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSaveRoles(user)}
                      disabled={savingUserId === user.id}
                    >
                      {savingUserId === user.id ? 'Saving…' : 'Save Roles'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
