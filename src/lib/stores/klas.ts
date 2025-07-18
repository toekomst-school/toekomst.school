import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Types
interface Klas {
	$id: string;
	klasnaam: string;
	jaar: number;
	schoolId: string;
	docenten: string[];
	leerlingen: string[];
	description?: string;
	teamId?: string;
	createdAt: string;
	createdBy: string;
	$createdAt: string;
	$updatedAt: string;
}

interface KlasMember {
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

interface KlasStore {
	selectedKlas: Klas | null;
	klassen: Klas[];
	members: KlasMember[];
	loading: boolean;
	error: string | null;
}

// Initial state
const initialState: KlasStore = {
	selectedKlas: null,
	klassen: [],
	members: [],
	loading: false,
	error: null
};

// Create the store
const createKlasStore = () => {
	const { subscribe, set, update } = writable<KlasStore>(initialState);

	// Load selected klas from localStorage on initialization
	if (browser) {
		const savedKlasId = localStorage.getItem('selectedKlasId');
		if (savedKlasId) {
			// Will be populated when klassen are loaded
			update(state => ({ ...state, selectedKlas: { $id: savedKlasId } as Klas }));
		}
	}

	return {
		subscribe,
		
		// Actions
		setKlassen: (klassen: Klas[]) => {
			update(state => {
				let selectedKlas = state.selectedKlas;
				
				// If we have a saved klas ID, find the actual klas object
				if (selectedKlas && selectedKlas.$id && !selectedKlas.klasnaam) {
					selectedKlas = klassen.find(k => k.$id === selectedKlas!.$id) || null;
				}
				
				return { ...state, klassen, selectedKlas };
			});
		},
		
		setSelectedKlas: (klas: Klas | null) => {
			update(state => ({ ...state, selectedKlas: klas }));
			
			// Save to localStorage
			if (browser) {
				if (klas) {
					localStorage.setItem('selectedKlasId', klas.$id);
				} else {
					localStorage.removeItem('selectedKlasId');
				}
			}
		},
		
		setMembers: (members: KlasMember[]) => {
			update(state => ({ ...state, members }));
		},
		
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		
		setError: (error: string | null) => {
			update(state => ({ ...state, error }));
		},
		
		addKlas: (klas: Klas) => {
			update(state => ({
				...state,
				klassen: [...state.klassen, klas]
			}));
		},
		
		updateKlas: (klasId: string, updates: Partial<Klas>) => {
			update(state => ({
				...state,
				klassen: state.klassen.map(klas => 
					klas.$id === klasId ? { ...klas, ...updates } : klas
				),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId 
					? { ...state.selectedKlas, ...updates } 
					: state.selectedKlas
			}));
		},
		
		removeKlas: (klasId: string) => {
			update(state => ({
				...state,
				klassen: state.klassen.filter(klas => klas.$id !== klasId),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId 
					? null 
					: state.selectedKlas
			}));
		},
		
		addMember: (member: KlasMember) => {
			update(state => ({
				...state,
				members: [...state.members, member]
			}));
		},
		
		updateMember: (membershipId: string, updates: Partial<KlasMember>) => {
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
		
		addStudent: (klasId: string, studentId: string) => {
			update(state => ({
				...state,
				klassen: state.klassen.map(klas => 
					klas.$id === klasId 
						? { ...klas, leerlingen: [...klas.leerlingen, studentId] }
						: klas
				),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId
					? { ...state.selectedKlas, leerlingen: [...state.selectedKlas.leerlingen, studentId] }
					: state.selectedKlas
			}));
		},
		
		removeStudent: (klasId: string, studentId: string) => {
			update(state => ({
				...state,
				klassen: state.klassen.map(klas => 
					klas.$id === klasId 
						? { ...klas, leerlingen: klas.leerlingen.filter(id => id !== studentId) }
						: klas
				),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId
					? { ...state.selectedKlas, leerlingen: state.selectedKlas.leerlingen.filter(id => id !== studentId) }
					: state.selectedKlas
			}));
		},
		
		addDocent: (klasId: string, docentId: string) => {
			update(state => ({
				...state,
				klassen: state.klassen.map(klas => 
					klas.$id === klasId 
						? { ...klas, docenten: [...klas.docenten, docentId] }
						: klas
				),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId
					? { ...state.selectedKlas, docenten: [...state.selectedKlas.docenten, docentId] }
					: state.selectedKlas
			}));
		},
		
		removeDocent: (klasId: string, docentId: string) => {
			update(state => ({
				...state,
				klassen: state.klassen.map(klas => 
					klas.$id === klasId 
						? { ...klas, docenten: klas.docenten.filter(id => id !== docentId) }
						: klas
				),
				selectedKlas: state.selectedKlas && state.selectedKlas.$id === klasId
					? { ...state.selectedKlas, docenten: state.selectedKlas.docenten.filter(id => id !== docentId) }
					: state.selectedKlas
			}));
		},
		
		reset: () => {
			set(initialState);
			if (browser) {
				localStorage.removeItem('selectedKlasId');
			}
		}
	};
};

export const klasStore = createKlasStore();
export type { Klas, KlasMember, KlasStore };