<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '../supabase';
import { Tree } from '../typesnmethods';
import { Session } from '@supabase/supabase-js';

const workingTree = defineModel<Tree>('workingTree', {
    required: true,
});
const selectedPersonId = defineModel<number | null>('selectedPersonId', {
    required: true,
});
const selectedFamilyId = defineModel<number | null>('selectedFamilyId', {
    required: true,
});
const session = defineModel<Session | null>('session', { required: true });

const signUpEmail = ref('');
const signUpPassword = ref('');
const signInEmail = ref('');
const signInPassword = ref('');

async function signUp() {
    const { data, error } = await supabase.auth.signUp({
        email: signUpEmail.value,
        password: signUpPassword.value,
    });

    console.log(data);
    console.log(error);
}

async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.value,
        password: signInPassword.value,
    });

    console.log(data);
    console.log(error);
}

async function signOut() {
    const { error } = await supabase.auth.signOut();

    console.log(error);
}
</script>

<template>
    <div v-if="session">
        <p>Inloggad som: {{ session.user.email }}</p>

        <button @click="signOut">Logga ut</button>
    </div>
    <div v-else>
        <form @submit.prevent="signUp">
            <input v-model="signUpEmail" type="text" placeholder="Email" />
            <input
                v-model="signUpPassword"
                type="password"
                placeholder="Lösenord"
            />
            <button type="submit">Skapa konto</button>
            <p>Bekräfta sedan din mailadress</p>
        </form>
        <form @submit.prevent="signIn">
            <input v-model="signInEmail" type="text" placeholder="Email" />
            <input
                v-model="signInPassword"
                type="password"
                placeholder="Lösenord"
            />
            <button type="submit">Logga in</button>
        </form>
    </div>
</template>
