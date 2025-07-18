import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Types
interface Team {
	$id: string;
	name: string;
	description?: string;
	$createdAt: string;
	$updatedAt: string;
}

interface TeamMember {
	$id: string;
	userId: string;
	userName: string;
	userEmail: string;
	roles: string[];
	teamId: string;
	status: string;
	$createdAt: string;
	$updatedAt: string;
}

interface TeamStore {
	selectedTeam: Team | null;
	teams: Team[];
	members: TeamMember[];
	loading: boolean;
	error: string | null;
}

// Initial state
const initialState: TeamStore = {
	selectedTeam: null,
	teams: [],
	members: [],
	loading: false,
	error: null
};

// Create the store
const createTeamStore = () => {
	const { subscribe, set, update } = writable<TeamStore>(initialState);

	// Load selected team from localStorage on initialization
	if (browser) {
		const savedTeamId = localStorage.getItem('selectedTeamId');
		if (savedTeamId) {
			// Will be populated when teams are loaded
			update(state => ({ ...state, selectedTeam: { $id: savedTeamId } as Team }));
		}
	}

	return {
		subscribe,
		
		// Actions
		setTeams: (teams: Team[]) => {
			update(state => {
				let selectedTeam = state.selectedTeam;
				
				// If we have a saved team ID, find the actual team object
				if (selectedTeam && selectedTeam.$id && !selectedTeam.name) {
					selectedTeam = teams.find(t => t.$id === selectedTeam!.$id) || null;
				}
				
				return { ...state, teams, selectedTeam };
			});
		},
		
		setSelectedTeam: (team: Team | null) => {
			update(state => ({ ...state, selectedTeam: team }));
			
			// Save to localStorage
			if (browser) {
				if (team) {
					localStorage.setItem('selectedTeamId', team.$id);
				} else {
					localStorage.removeItem('selectedTeamId');
				}
			}
		},
		
		setMembers: (members: TeamMember[]) => {
			update(state => ({ ...state, members }));
		},
		
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error }));
		},
		
		addTeam: (team: Team) => {
			update(state => ({
				...state,
				teams: [...state.teams, team]
			}));
		},
		
		updateTeam: (teamId: string, updates: Partial<Team>) => {
			update(state => ({
				...state,
				teams: state.teams.map(team => 
					team.$id === teamId ? { ...team, ...updates } : team
				),
				selectedTeam: state.selectedTeam && state.selectedTeam.$id === teamId 
					? { ...state.selectedTeam, ...updates } 
					: state.selectedTeam
			}));
		},
		
		removeTeam: (teamId: string) => {
			update(state => ({
				...state,
				teams: state.teams.filter(team => team.$id !== teamId),
				selectedTeam: state.selectedTeam && state.selectedTeam.$id === teamId 
					? null 
					: state.selectedTeam
			}));
		},
		
		addMember: (member: TeamMember) => {
			update(state => ({
				...state,
				members: [...state.members, member]
			}));
		},
		
		updateMember: (membershipId: string, updates: Partial<TeamMember>) => {
			update(state => ({
				...state,
				members: state.members.map(member => 
					member.$id === membershipId ? { ...member, ...updates } : member
				)
			}));
		},
		
		removeMember: (membershipId: string) => {
			update(state => ({
				...state,
				members: state.members.filter(member => member.$id !== membershipId)
			}));
		},
		
		reset: () => {
			set(initialState);
			if (browser) {
				localStorage.removeItem('selectedTeamId');
			}
		}
	};
};

export const teamStore = createTeamStore();
export type { Team, TeamMember, TeamStore };